import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { authenticateAdmin, isAuthError } from '../_shared/auth.ts';

interface EventData {
  sport: string;
  league: string | null;
  home_team: string | null;
  away_team: string | null;
  event_date: string;
  venue: string | null;
  round: string | null;
}

interface MistralMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface MistralChoice {
  message: {
    content: string | null;
    tool_calls?: Array<{
      function: {
        name: string;
        arguments: string;
      };
    }>;
  };
  finish_reason: string;
}

interface MistralResponse {
  choices: MistralChoice[];
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Authenticate admin
    const authResult = await authenticateAdmin(req, ['editor', 'admin', 'owner']);
    if (isAuthError(authResult)) {
      return new Response(
        JSON.stringify({ success: false, error: authResult.error }),
        { status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { event } = await req.json() as { event: EventData };

    if (!event) {
      return new Response(
        JSON.stringify({ success: false, error: 'Event data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const MISTRAL_API_KEY = Deno.env.get('MISTRAL_API_KEY');
    if (!MISTRAL_API_KEY) {
      console.error('MISTRAL_API_KEY is not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context from event data
    const eventContext: string[] = [];
    eventContext.push(`Sport: ${event.sport}`);
    if (event.league) eventContext.push(`Compétition: ${event.league}`);
    if (event.home_team && event.away_team) {
      eventContext.push(`Match: ${event.home_team} vs ${event.away_team}`);
    }
    if (event.venue) eventContext.push(`Lieu: ${event.venue}`);
    if (event.round) eventContext.push(`Journée/Round: ${event.round}`);
    if (event.event_date) {
      const date = new Date(event.event_date);
      eventContext.push(`Date: ${date.toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`);
    }

    // Build the prompt - comprehensive prompt that doesn't require web search
    const systemPrompt = `Tu es un rédacteur sportif expert travaillant pour une plateforme de streaming sportif. Tu génères des descriptions engageantes pour les événements.

RÈGLES STRICTES :
- Écris en français
- 2-3 phrases maximum (80-150 mots)
- Ton dynamique et professionnel
- Mentionne les enjeux possibles si c'est un match important (derby, classique, finale, etc.)
- Sois factuel mais enthousiaste
- Ne fais PAS de suppositions sur les classements actuels si tu n'es pas sûr
- Réponds UNIQUEMENT avec la description, sans commentaires additionnels`;

    const userPrompt = `Génère une description attractive pour cet événement sportif :

${eventContext.join('\n')}

Écris une description courte et percutante qui donne envie aux spectateurs de regarder ce match.`;

    const messages: MistralMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    console.log('Calling Mistral API for event:', event.home_team, 'vs', event.away_team);

    // Call Mistral AI - simple completion without tools
    const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages,
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!mistralResponse.ok) {
      const errorText = await mistralResponse.text();
      console.error('Mistral API error:', mistralResponse.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: MistralResponse = await mistralResponse.json();
    console.log('Mistral response:', JSON.stringify(result, null, 2));

    const choice = result.choices?.[0];
    const description = choice?.message?.content;

    if (!description) {
      console.error('No content in response:', JSON.stringify(result));
      return new Response(
        JSON.stringify({ success: false, error: 'No description generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean up the description (remove quotes if present)
    const cleanDescription = description.replace(/^["']|["']$/g, '').trim();

    console.log('Generated description:', cleanDescription);

    return new Response(
      JSON.stringify({ success: true, data: { description: cleanDescription } }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in admin-ai-description:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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

interface MistralResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
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

    // Build the prompt
    const systemPrompt = `Tu es un rédacteur sportif expert. Génère une description engageante pour un événement sportif destinée à une plateforme de streaming.

La description doit :
- Être en français
- Contenir 2-3 phrases maximum (80-150 mots)
- Mentionner les enjeux du match si pertinent (classement, rivalité, etc.)
- Être dynamique et attractive pour les spectateurs
- Utiliser un ton professionnel mais accessible

Utilise la recherche web pour trouver des informations actuelles sur les équipes, leur forme récente, et les enjeux du match.`;

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

    const userPrompt = `Génère une description pour cet événement sportif :

${eventContext.join('\n')}

Recherche sur le web les dernières informations sur ces équipes/joueurs pour enrichir ta description avec des données actuelles (forme récente, classement, enjeux).`;

    const messages: MistralMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    // Call Mistral AI with web search tool
    const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages,
        tools: [{
          type: 'function',
          function: {
            name: 'web_search',
            description: 'Search the web for current information about teams, players, and match context'
          }
        }],
        tool_choice: 'auto',
        max_tokens: 500,
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
    const description = result.choices?.[0]?.message?.content;

    if (!description) {
      return new Response(
        JSON.stringify({ success: false, error: 'No description generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean up the description (remove quotes if present)
    const cleanDescription = description.replace(/^["']|["']$/g, '').trim();

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

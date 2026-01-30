import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CountryTagsInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  variant?: 'allowed' | 'blocked';
  className?: string;
}

export function CountryTagsInput({
  value,
  onChange,
  placeholder = "FR, US, GB...",
  variant = 'allowed',
  className,
}: CountryTagsInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleAddCountry = () => {
    const country = inputValue.trim().toUpperCase();
    if (country && country.length === 2 && !value.includes(country)) {
      onChange([...value, country]);
      setInputValue('');
    }
  };

  const handleRemoveCountry = (country: string) => {
    onChange(value.filter((c) => c !== country));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCountry();
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      handleRemoveCountry(value[value.length - 1]);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value.toUpperCase().slice(0, 2))}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1"
          maxLength={2}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleAddCountry}
          disabled={!inputValue || inputValue.length !== 2}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((country) => (
            <Badge
              key={country}
              variant={variant === 'allowed' ? 'secondary' : 'destructive'}
              className="gap-1 pr-1"
            >
              {country}
              <button
                type="button"
                onClick={() => handleRemoveCountry(country)}
                className="ml-1 rounded-full hover:bg-background/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

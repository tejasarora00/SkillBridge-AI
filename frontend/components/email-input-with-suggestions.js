"use client";

import { useMemo, useState } from "react";

const DEFAULT_DOMAINS = [
  "gmail.com",
  "hotmail.com",
];

function getSuggestions(value, domains) {
  const email = String(value || "");
  const atIndex = email.indexOf("@");

  if (atIndex === -1) {
    return [];
  }

  const localPart = email.slice(0, atIndex).trim();
  const domainPart = email.slice(atIndex + 1).trim().toLowerCase();

  if (!localPart) {
    return [];
  }

  return domains.filter((domain) => domain.startsWith(domainPart)).slice(0, 2);
}

export function EmailInputWithSuggestions({
  value,
  onChange,
  placeholder,
  required = false,
  domains = DEFAULT_DOMAINS,
  ...props
}) {
  const [focused, setFocused] = useState(false);
  const atIndex = String(value || "").indexOf("@");
  const localPart =
    atIndex === -1 ? "" : String(value || "").slice(0, atIndex).trim();
  const suggestions = useMemo(
    () => getSuggestions(value, domains),
    [value, domains],
  );

  const showSuggestions = focused && suggestions.length > 0;
  const selectDomain = (domain) => {
    onChange({ target: { value: `${localPart}@${domain}` } });
    setFocused(false);
  };

  return (
    <div className="email-input-wrap">
      <input
        {...props}
        required={required}
        type="email"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="email"
        onKeyDown={(event) => {
          if (event.key === "Enter" && showSuggestions && suggestions[0]) {
            event.preventDefault();
            selectDomain(suggestions[0]);
            return;
          }

          if (typeof props.onKeyDown === "function") {
            props.onKeyDown(event);
          }
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          window.setTimeout(() => {
            setFocused(false);
          }, 120);
        }}
      />
      {showSuggestions ? (
        <div className="email-suggestion-list">
          {suggestions.map((domain) => (
            <button
              key={domain}
              type="button"
              className="email-suggestion-item"
              onMouseDown={(event) => {
                event.preventDefault();
                selectDomain(domain);
              }}
            >
              {domain}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

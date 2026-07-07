"use client";

import { useState, Fragment, useCallback } from "react";
import { Combobox, Transition } from "@headlessui/react";
import { Check, ChevronsUpDown } from "lucide-react";

const TRANSACTION_TYPES = [
  "Abbonamento",
  "Acquisto",
  "AZIONE",
  "Bonifico",
  "Buono fruttifero",
  "Cancellazione rimborso",
  "Commissione",
  "Competenze",
  "Delivery",
  "Eccesso Rimborso",
  "Entrata",
  "ETF",
  "Imposte",
  "Iscrizione",
  "Ordine",
  "Ordine cloud",
  "Prelievo",
  "Quattordicesima",
  "Rata",
  "Refund",
  "Ricarica",
  "Spesa",
  "Stipendio",
  "TFR",
  "Tredicesima",
];

interface TransactionTypeComboboxProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function TransactionTypeCombobox({
  value,
  onChange,
}: TransactionTypeComboboxProps) {
  const [query, setQuery] = useState("");

  // Reset query quando il combobox si chiude
  const handleClose = useCallback(() => {
    setQuery("");
  }, []);

  const filteredTypes =
    query === ""
      ? TRANSACTION_TYPES
      : TRANSACTION_TYPES.filter((type) =>
          type
            .toLowerCase()
            .replace(/\s+/g, "")
            .includes(query.toLowerCase().replace(/\s+/g, ""))
        );

  const handleChange = (newValue: string | null) => {
    onChange(newValue);
  };

  return (
    <div className="w-[200px]">
      {" "}
      {/* Larghezza ottimale per testi lunghi */}
      <Combobox
        value={value ?? ""}
        onChange={handleChange}
        onClose={handleClose}
      >
        {({ open }) => (
          <>
            <div className="relative w-full">
              <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-surface text-left border border-edge focus-within:ring-2 focus-within:ring-primary focus-within:border-primary shadow-card">
                <Combobox.Input
                  className="w-full border-none py-2.5 pl-3 pr-12 text-sm leading-6 text-ink focus:ring-0 focus:outline-none"
                  displayValue={(transactionType: string) => transactionType}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Seleziona tipo di transazione..."
                />
                <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <ChevronsUpDown
                    className="h-5 w-5 text-ink-muted"
                    aria-hidden="true"
                  />
                </Combobox.Button>
              </div>
            </div>

            <Transition
              show={open}
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Combobox.Options className="absolute z-50 mt-1 w-[360px] max-h-60 overflow-auto rounded-md bg-surface py-1 text-base shadow-elevated ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {filteredTypes.length === 0 && query !== "" ? (
                  <div className="relative cursor-default select-none py-2 px-4 text-ink-secondary">
                    Nessun tipo trovato.
                  </div>
                ) : (
                  filteredTypes.map((type) => (
                    <Combobox.Option
                      key={type}
                      className={({ active }) =>
                        `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                          active ? "bg-primary text-white" : "text-ink"
                        }`
                      }
                      value={type}
                    >
                      {({ selected, active }) => (
                        <>
                          <span
                            className={`block truncate ${
                              selected ? "font-medium" : "font-normal"
                            }`}
                          >
                            {type}
                          </span>
                          {selected ? (
                            <span
                              className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                active ? "text-white" : "text-primary"
                              }`}
                            >
                              <Check className="h-4 w-4" aria-hidden="true" />
                            </span>
                          ) : null}
                        </>
                      )}
                    </Combobox.Option>
                  ))
                )}
              </Combobox.Options>
            </Transition>
          </>
        )}
      </Combobox>
    </div>
  );
}

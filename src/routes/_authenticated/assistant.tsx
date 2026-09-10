import { Link, createFileRoute } from "@tanstack/react-router";
import { Send, Sparkles } from "lucide-react";
import { useState } from "react";

import { ErrorState, LoadingState, PageHeader } from "@/components/page";
import { Panel } from "@/components/signals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SUGGESTED_QUESTIONS, answerQuestion, type AssistantAnswer } from "@/lib/assistant";
import { useInventory } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "AI assistant — AI Inventory Intelligence" },
      {
        name: "description",
        content: "Ask questions about your stock and get answers calculated from your own data.",
      },
      { property: "og:title", content: "AI inventory assistant" },
      {
        property: "og:description",
        content: "Plain-language answers backed by real numbers, never invented ones.",
      },
    ],
  }),
  component: AssistantPage,
});

type Turn = { question: string; answer: AssistantAnswer };

function AssistantPage() {
  const { snapshot, isLoading, error } = useInventory();
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);

  if (isLoading) return <LoadingState />;
  if (error)
    return <ErrorState message={error instanceof Error ? error.message : "Unknown error"} />;
  if (!snapshot) return null;

  function ask(question: string) {
    const q = question.trim();
    if (!q || !snapshot) return;
    setTurns((prev) => [...prev, { question: q, answer: answerQuestion(q, snapshot) }]);
    setInput("");
  }

  return (
    <>
      <PageHeader
        title="Inventory assistant"
        subtitle="Every answer is computed directly from your products and sales history, so the numbers always match the rest of the app."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="space-y-3">
          {turns.length === 0 ? (
            <Panel>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="size-4 text-primary" />
                Ask about reorders, risk, dead stock, cash tied up, or overall health.
              </div>
            </Panel>
          ) : (
            turns.map((t, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-end">
                  <p className="max-w-lg rounded-lg bg-panel2 px-3 py-2 text-sm text-foreground">
                    {t.question}
                  </p>
                </div>
                <Panel>
                  <p className="text-sm text-foreground">{t.answer.text}</p>
                  {t.answer.bullets.length > 0 ? (
                    <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                      {t.answer.bullets.map((b, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-primary">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {t.answer.links.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {t.answer.links.map((l) => (
                        <Link
                          key={l.id}
                          to="/products/$id"
                          params={{ id: l.id }}
                          className="rounded-full border border-line px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </Panel>
              </div>
            ))
          )}

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your inventory…"
            />
            <Button type="submit" disabled={!input.trim()}>
              <Send className="size-4" />
              Ask
            </Button>
          </form>
        </div>

        <Panel className="h-fit">
          <p className="label-mono">Try asking</p>
          <div className="mt-3 space-y-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => ask(q)}
                className="block w-full rounded-md border border-line px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-panel2 hover:text-foreground"
              >
                {q}
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

import { Fragment, type ReactNode, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Concept } from "../domain/models";
import { useAppServices } from "../state/AppServicesProvider";

function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    .filter(Boolean)
    .map((part, index) => {
      const key = `${keyPrefix}-${index}`;

      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={key}>{part.slice(2, -2)}</strong>;
      }

      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[0.9em] text-ink"
            key={key}
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      return <Fragment key={key}>{part}</Fragment>;
    });
}

function getListItems(block: string, marker: RegExp): string[] {
  return block.split("\n").reduce<string[]>((items, line) => {
    if (marker.test(line)) {
      items.push(line.replace(marker, ""));
    } else if (items.length > 0) {
      items[items.length - 1] = `${items[items.length - 1]} ${line.trim()}`;
    }

    return items;
  }, []);
}

function getTableRows(block: string): string[][] {
  return block
    .split("\n")
    .filter((line) => !/^\|\s*:?-+/.test(line))
    .map((line) =>
      line
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim()),
    );
}

function renderTutorialSection(section: string, index: number): ReactNode {
  const image = section.match(/^!\[([^\]]+)\]\((content\/[a-zA-Z0-9_/-]+\.(?:svg|png|webp))\)$/);
  if (image) {
    return (
      <figure className="mx-auto w-full max-w-lg" key={index}>
        <img
          src={`${import.meta.env.BASE_URL}${image[2]}`}
          alt={image[1]}
          className="block h-auto w-full"
          loading="lazy"
        />
      </figure>
    );
  }

  if (section.startsWith("### ")) {
    return (
      <h5 className="pt-2 text-lg font-semibold text-ink" key={index}>
        {renderInlineMarkdown(section.replace(/^### /, ""), `h5-${index}`)}
      </h5>
    );
  }

  if (section.startsWith("## ")) {
    return (
      <h4 className="pt-3 text-xl font-semibold text-ink" key={index}>
        {renderInlineMarkdown(section.replace(/^## /, ""), `h4-${index}`)}
      </h4>
    );
  }

  if (section.startsWith("# ")) {
    return (
      <h3 className="text-2xl font-semibold text-ink" key={index}>
        {renderInlineMarkdown(section.replace(/^# /, ""), `h3-${index}`)}
      </h3>
    );
  }

  if (section.startsWith("|")) {
    const rows = getTableRows(section);
    const [header, ...body] = rows;

    return (
      <div className="overflow-x-auto" key={index}>
        <table className="min-w-full border-collapse text-left text-sm text-stone-700">
          <thead>
            <tr>
              {header.map((cell, cellIndex) => (
                <th
                  className="border-b border-stone-300 bg-stone-50 px-3 py-2 font-semibold text-ink"
                  key={`${cell}-${cellIndex}`}
                  scope="col"
                >
                  {renderInlineMarkdown(cell, `table-${index}-head-${cellIndex}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, rowIndex) => (
              <tr key={`${row.join("-")}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td
                    className="border-b border-stone-200 px-3 py-2"
                    key={`${cell}-${cellIndex}`}
                  >
                    {renderInlineMarkdown(cell, `table-${index}-${rowIndex}-${cellIndex}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (section.startsWith("- ")) {
    const items = getListItems(section, /^-\s+/);

    return (
      <ul className="space-y-2 text-sm leading-7 text-stone-700" key={index}>
        {items.map((item, itemIndex) => (
          <li className="ml-5 list-disc" key={`${item}-${itemIndex}`}>
            {renderInlineMarkdown(item, `bullet-${index}-${itemIndex}`)}
          </li>
        ))}
      </ul>
    );
  }

  if (/^\d+\.\s/.test(section)) {
    const items = getListItems(section, /^\d+\.\s+/);

    return (
      <ol className="space-y-2 text-sm leading-7 text-stone-700" key={index}>
        {items.map((item, itemIndex) => (
          <li className="ml-5 list-decimal" key={`${item}-${itemIndex}`}>
            {renderInlineMarkdown(item, `number-${index}-${itemIndex}`)}
          </li>
        ))}
      </ol>
    );
  }

  if (section.startsWith("> ")) {
    return (
      <blockquote
        className="border-l-4 border-accent/40 pl-4 text-sm italic leading-7 text-stone-700"
        key={index}
      >
        {renderInlineMarkdown(section.replace(/^>\s?/, ""), `quote-${index}`)}
      </blockquote>
    );
  }

  return (
    <p className="text-sm leading-7 text-stone-700" key={index}>
      {renderInlineMarkdown(section.replace(/\n/g, " "), `paragraph-${index}`)}
    </p>
  );
}

export function ConceptTutorialPage() {
  const { conceptId } = useParams();
  const { contentRepository } = useAppServices();
  const [concept, setConcept] = useState<Concept | null>(null);
  const [tutorialContent, setTutorialContent] = useState<string | null>(null);

  useEffect(() => {
    if (!conceptId) {
      return;
    }

    contentRepository.getConcept(conceptId).then(setConcept);
    contentRepository.getTutorialContent(conceptId).then(setTutorialContent);
  }, [conceptId, contentRepository]);

  if (!concept) {
    return <div className="panel panel-padding">Concept not found.</div>;
  }

  if (!tutorialContent) {
    return <div className="panel panel-padding">Tutorial not available yet.</div>;
  }

  const sections = tutorialContent
    .split("\n\n")
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm font-medium text-accent" to={`/concept/${concept.id}`}>
          Back to concept
        </Link>
        <h2 className="mt-2 text-3xl font-semibold text-ink">{concept.title} Tutorial</h2>
        <p className="mt-2 text-sm text-stone-600">
          Read through the idea first, then return for practice when it is available.
        </p>
      </div>

      <article className="panel panel-padding space-y-4">
        {sections.map(renderTutorialSection)}
      </article>
    </section>
  );
}

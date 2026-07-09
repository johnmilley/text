---
title: academic writing — footnotes and bibliography
---

# academic writing: footnotes and a bibliography

Longer, source-backed writing needs two things markdown doesn't obviously
provide: inline citations that don't interrupt the sentence, and a
reference list they point back to. Both exist already — this lesson is a
short worked example, using the origin of graph theory as its subject
matter (which also sets up [[06-mermaid]] and `07-latex-graph-theory.tex`,
if you want to see the same territory covered by a diagramming tool and by
LaTeX afterward).

## a worked example

Graph theory is usually dated to a single paper: Leonhard Euler's 1736
solution to the *Seven Bridges of Königsberg* problem, which asked whether
a walker could cross all seven bridges of the city exactly once and return
to the start.[^euler] Euler's insight was to discard everything about the
problem except which landmasses connected to which — reducing the city to
what we would now call a graph, a set of nodes and edges — and to show that
such a walk is possible if and only if at most two nodes have an odd number
of edges.[^parity] Königsberg's four landmasses each had an odd number of
bridges, so no such walk existed, and Euler proved it algebraically rather
than by exhausting every route by hand.

The terminology consolidated slowly. "Graph" in this sense didn't appear in
English until Sylvester's work in the 1870s,[^sylvester] and the field
wasn't textbook-organized until well into the twentieth century — the two
references below are still commonly assigned in introductory courses today.

## how the syntax works

A footnote marker is `[^label]` inline, wherever the claim is made:

```
Euler's insight was to discard everything but adjacency.[^euler]
```

...and its text is defined anywhere in the same document — conventionally
at the end of the section — with a matching `[^label]:`:

```
[^euler]: Euler, L. (1736). *Solutio problematis ad geometriam situs
    pertinentis*. Commentarii academiae scientiarum Petropolitanae, 8, 128–140.
```

The label is never shown to the reader; it only has to be unique within the
note. `text` renders the marker as a small superscript link down to the
note, and back again — try clicking `[^euler]` above.

## the bibliography

A footnote is for *this specific claim*; a bibliography is the full list of
everything the piece draws on, whether or not each item is footnoted
individually. Convention (not special syntax — this is a heading and a
list, nothing more) is a `## references` or `## bibliography` section at
the very end:

## references

- West, D. B. (2001). *Introduction to Graph Theory* (2nd ed.). Prentice
  Hall.
- Diestel, R. (2017). *Graph Theory* (5th ed.). Springer.
- Biggs, N., Lloyd, E., & Wilson, R. (1976). *Graph Theory 1736–1936*.
  Oxford University Press.

## footnotes

[^euler]: Euler, L. (1736). *Solutio problematis ad geometriam situs
    pertinentis*. Commentarii academiae scientiarum Petropolitanae, 8, 128–140.
[^parity]: This is the origin of what's now called the handshake lemma —
    see `07-latex-graph-theory.tex` for the formal statement and proof.
[^sylvester]: Sylvester, J. J. (1878). "Chemistry and Algebra". *Nature*, 17,
    284. Often cited as the first use of "graph" in the modern
    mathematical sense.

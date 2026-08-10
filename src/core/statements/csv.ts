import Papa from "papaparse";

export const splitRows = (text: string): ReadonlyArray<ReadonlyArray<string>> =>
  Papa.parse<ReadonlyArray<string>>(text, {
    skipEmptyLines: "greedy",
    delimitersToGuess: [",", "\t", ";", "|"],
  }).data.map((row) => row.map((cell) => cell.trim()));

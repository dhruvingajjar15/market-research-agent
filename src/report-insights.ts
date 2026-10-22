import type { ResearchReport } from "./index.js";

export interface QueryCoverage {
  query: string;
  total: number;
  firstSeen: number;
  repeated: number;
}

export interface DomainCoverage {
  domain: string;
  count: number;
}

export interface EvidenceInsights {
  sourceCount: number;
  domainCount: number;
  multiQuerySourceCount: number;
  queryCoverage: QueryCoverage[];
  domainCoverage: DomainCoverage[];
  observations: string[];
}

const UNKNOWN_WEBSITE = "Unknown website";

function websiteFromUrl(value: string): string {
  try {
    const url = new URL(value);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.hostname) {
      return UNKNOWN_WEBSITE;
    }
    const hostname = url.hostname.replace(/^www\./i, "").toLowerCase();
    return hostname || UNKNOWN_WEBSITE;
  } catch {
    return UNKNOWN_WEBSITE;
  }
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** Summarize recorded search evidence without drawing market conclusions from link counts. */
export function buildEvidenceInsights(report: ResearchReport): EvidenceInsights {
  // A repeated generated query is one chart category, in its first recorded position.
  const queries = [...new Set(report.generatedQueries)];
  const queryCoverage: QueryCoverage[] = queries.map((query) => ({
    query,
    total: 0,
    firstSeen: 0,
    repeated: 0,
  }));
  const domainCounts = new Map<string, number>();
  let multiQuerySourceCount = 0;
  let unmappedSourceCount = 0;

  for (const source of report.sourcesUsed) {
    const sourceQueries = new Set(source.queries);
    let matchedQueries = 0;

    for (const item of queryCoverage) {
      if (!sourceQueries.has(item.query)) {
        continue;
      }
      item.total += 1;
      if (matchedQueries === 0) {
        item.firstSeen += 1;
      } else {
        item.repeated += 1;
      }
      matchedQueries += 1;
    }

    if (matchedQueries > 1) {
      multiQuerySourceCount += 1;
    }
    if (matchedQueries === 0) {
      unmappedSourceCount += 1;
    }

    const domain = websiteFromUrl(source.url);
    domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
  }

  const domainCoverage = [...domainCounts].map(([domain, count]) => ({ domain, count }));
  domainCoverage.sort((a, b) => b.count - a.count || (a.domain < b.domain ? -1 : a.domain > b.domain ? 1 : 0));
  const domainCount = domainCounts.size - Number(domainCounts.has(UNKNOWN_WEBSITE));
  const sourceCount = report.sourcesUsed.length;
  const observations: string[] = [];

  if (sourceCount === 0) {
    observations.push("No sources were recorded for this report.");
  } else {
    observations.push(`${plural(sourceCount, "source")} recorded across ${plural(domainCount, "identifiable website")}.`);
    const identifiableDomains = domainCoverage.filter((item) => item.domain !== UNKNOWN_WEBSITE);
    if (sourceCount > 1 && identifiableDomains.length > 0) {
      const highestCount = identifiableDomains[0].count;
      const leaders = identifiableDomains.filter((item) => item.count === highestCount);
      if (leaders.length === 1) {
        observations.push(`${leaders[0].domain} accounts for ${highestCount} of ${sourceCount} recorded sources, the most among identifiable websites.`);
      } else {
        observations.push(`${plural(leaders.length, "identifiable website")} share the highest count, with ${highestCount} of ${sourceCount} recorded sources each.`);
      }
    }
    if (queryCoverage.length > 1 && queryCoverage.some((item) => item.total > 0)) {
      const counts = queryCoverage.map((item) => item.total);
      const minimum = Math.min(...counts);
      const maximum = Math.max(...counts);
      if (minimum === maximum) {
        observations.push(`Each of ${plural(queryCoverage.length, "generated search query", "generated search queries")} is associated with ${plural(minimum, "recorded source")}.`);
      } else {
        observations.push(`Across ${plural(queryCoverage.length, "generated search query", "generated search queries")}, recorded sources associated with each query range from ${minimum} to ${maximum}.`);
      }
    }
    if (multiQuerySourceCount > 0) {
      observations.push(`${plural(multiQuerySourceCount, "source")} appeared in more than one generated search query.`);
    }
    const unknownCount = domainCounts.get(UNKNOWN_WEBSITE) ?? 0;
    if (unknownCount > 0) {
      observations.push(`${plural(unknownCount, "source")} could not be assigned to a website from its URL.`);
    }
    if (queries.length > 0 && unmappedSourceCount > 0) {
      observations.push(`${plural(unmappedSourceCount, "source")} did not match a recorded generated search query.`);
    }
  }

  if (queries.length === 0) {
    observations.push("No generated search queries were recorded for this report.");
  }

  return {
    sourceCount,
    domainCount,
    multiQuerySourceCount,
    queryCoverage,
    domainCoverage,
    observations,
  };
}

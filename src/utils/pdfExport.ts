import { jsPDF } from "jspdf";
import { Content } from "@google/genai";
import { Personality, Scenario, UserPersona, RelationshipMetrics, MemoryPalace, MemoryDrawer } from "../types";
import { ensureCharacterState } from "../characterStateEngine";
import { calculateRelationshipMetrics } from "./relationshipMetricsCalc";

export interface ExportChatPdfOptions {
  personality: Personality | null;
  scenario?: Scenario | null;
  userPersona?: UserPersona | null;
  messages: Content[];
  getTextContent: (content: Content) => string;
  metrics?: RelationshipMetrics | null;
  palace?: MemoryPalace | null;
}

/**
 * Strips raw markdown control characters while preserving structural readability.
 */
function cleanMarkdownForPdf(text: string): string {
  if (!text) return "";
  return text
    // Replace markdown headers (### Header -> Header)
    .replace(/^#{1,6}\s+(.*)$/gm, "$1")
    // Bold / italic asterisks or underscores: preserve text
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    // Inline code backticks
    .replace(/`([^`]+)`/g, "$1")
    // Code blocks
    .replace(/```[a-z]*\n([\s\S]*?)```/g, "$1")
    // Convert multiple empty lines to at most double newlines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Exports current conversation into an easy-to-read, beautifully styled PDF document,
 * complete with end-of-transcript Vitals & Status, Mood & Composure, Scene & Setting,
 * Active Status Effects, Key Memory Board, and Metrics Breakdown.
 */
export async function exportChatToPdf({
  personality,
  scenario,
  userPersona,
  messages,
  getTextContent,
  metrics: providedMetrics,
  palace: providedPalace,
}: ExportChatPdfOptions): Promise<{ success: boolean; filename: string; turnCount: number }> {
  const charName = personality?.name?.trim() || "AI Character";
  const userName = userPersona?.name?.trim() || "User";
  const scenarioTitle = scenario?.name?.trim() || personality?.scenario?.trim() || null;

  // Filter messages that have non-empty text content
  const validMessages = messages
    .map((msg, index) => {
      const rawText = getTextContent(msg);
      return {
        role: msg.role === "user" ? "user" : "model",
        text: cleanMarkdownForPdf(rawText),
        rawText,
        index,
      };
    })
    .filter((m) => m.text.length > 0);

  if (validMessages.length === 0) {
    throw new Error("There are no chat messages in this conversation to export.");
  }

  // Fetch or resolve relationship metrics & mempalace data
  let metrics: RelationshipMetrics | null = providedMetrics || null;
  let palace: MemoryPalace | null = providedPalace || null;

  if (personality?.id && (!metrics || !palace)) {
    try {
      const res = await fetch(`/api/mempalace/${personality.id}/relationship-metrics`);
      if (res.ok) {
        const data = await res.json();
        if (!metrics && data.metrics) metrics = data.metrics;
        if (!palace && data.palace) palace = data.palace;
      }
    } catch (e) {
      console.warn("Could not load relationship metrics from server:", e);
    }
  }

  // Fallback palace & metrics if none available
  if (!palace) {
    palace = {
      personalityId: personality?.id || "default",
      name: `${charName}'s Mind Palace`,
      wings: [],
      drawers: [],
      entityGraph: [],
    };
  }
  if (!metrics) {
    metrics = calculateRelationshipMetrics(palace, charName, userName);
  }

  const charState = ensureCharacterState(personality);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 15;
  const marginTop = 20;
  const marginBottom = 20;
  const usableWidth = pageWidth - marginX * 2; // 180mm
  const maxY = pageHeight - marginBottom;

  let currentY = marginTop;

  const ensureSpace = (neededHeight: number) => {
    if (currentY + neededHeight > maxY) {
      doc.addPage();
      currentY = marginTop;
    }
  };

  // ----------------------------------------------------
  // Top Accent Stripe (Page 1)
  // ----------------------------------------------------
  doc.setFillColor(217, 119, 6); // Warm Amber (#D97706)
  doc.rect(0, 0, pageWidth, 4, "F");

  // Document Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(24, 24, 27); // Zinc 900
  doc.text("Roleplay Chat Transcript", marginX, currentY);
  currentY += 7;

  // Subtitle / Session Meta
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139); // Slate 500
  const exportDateStr = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(`Exported on ${exportDateStr} • Total Dialogue Turns: ${validMessages.length}`, marginX, currentY);
  currentY += 6;

  // ----------------------------------------------------
  // Session Summary Card Header
  // ----------------------------------------------------
  const summaryBoxY = currentY;
  const summaryBoxPadding = 4;
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.3);

  const metaLines: { label: string; value: string }[] = [
    { label: "Character:", value: charName },
    { label: "User Persona:", value: userName },
  ];
  if (scenarioTitle) {
    metaLines.push({ label: "Active Scenario:", value: scenarioTitle });
  }
  if (personality?.description) {
    metaLines.push({ label: "Character Summary:", value: personality.description.slice(0, 160) });
  }

  const summaryHeight = summaryBoxPadding * 2 + metaLines.length * 5.2;
  doc.roundedRect(marginX, summaryBoxY, usableWidth, summaryHeight, 2, 2, "FD");

  let metaY = summaryBoxY + summaryBoxPadding + 3.8;
  metaLines.forEach((item) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85); // Slate 700
    doc.text(item.label, marginX + summaryBoxPadding, metaY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105); // Slate 600
    const labelWidth = doc.getTextWidth(item.label) + 2.5;
    const maxValWidth = usableWidth - summaryBoxPadding * 2 - labelWidth;
    const truncatedVal = doc.splitTextToSize(item.value, maxValWidth)[0] || item.value;
    doc.text(truncatedVal, marginX + summaryBoxPadding + labelWidth, metaY);
    metaY += 5.2;
  });

  currentY = summaryBoxY + summaryHeight + 8;

  // ----------------------------------------------------
  // Conversation Messages Loop
  // ----------------------------------------------------
  const messageCardPadding = 3.8;
  const textInnerWidth = usableWidth - messageCardPadding * 2 - 3; // ~170mm

  validMessages.forEach((msg, idx) => {
    const isUser = msg.role === "user";
    const speakerName = isUser ? userName : charName;
    const turnBadge = `Turn #${idx + 1}`;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const splitLines = doc.splitTextToSize(msg.text, textInnerWidth);
    const lineHeight = 4.2;
    const textBlockHeight = splitLines.length * lineHeight;

    const cardHeaderHeight = 6.5;
    const totalCardHeight = messageCardPadding * 2 + cardHeaderHeight + textBlockHeight;

    if (currentY + totalCardHeight > maxY && totalCardHeight <= (maxY - marginTop)) {
      doc.addPage();
      currentY = marginTop;
    }

    if (totalCardHeight > (maxY - marginTop)) {
      let linesRemaining = [...splitLines];
      let isFirstChunk = true;

      while (linesRemaining.length > 0) {
        if (currentY + 25 > maxY) {
          doc.addPage();
          currentY = marginTop;
        }

        const availableSpace = maxY - currentY - messageCardPadding * 2 - (isFirstChunk ? cardHeaderHeight : 0);
        const maxLinesFit = Math.max(2, Math.floor(availableSpace / lineHeight));
        const currentChunkLines = linesRemaining.slice(0, maxLinesFit);
        linesRemaining = linesRemaining.slice(maxLinesFit);

        const chunkHeight = messageCardPadding * 2 + (isFirstChunk ? cardHeaderHeight : 0) + currentChunkLines.length * lineHeight;

        renderMessageCard(
          doc,
          marginX,
          currentY,
          usableWidth,
          chunkHeight,
          messageCardPadding,
          isUser,
          speakerName,
          turnBadge,
          currentChunkLines,
          lineHeight,
          isFirstChunk
        );

        currentY += chunkHeight + 4;
        isFirstChunk = false;
      }
      return;
    }

    renderMessageCard(
      doc,
      marginX,
      currentY,
      usableWidth,
      totalCardHeight,
      messageCardPadding,
      isUser,
      speakerName,
      turnBadge,
      splitLines,
      lineHeight,
      true
    );

    currentY += totalCardHeight + 3.5;
  });

  // =========================================================================
  // AT THE VERY END OF CHAT TRANSCRIPT:
  // Vitals & Status, Mood & Composure, Scene & Setting, Active Status Effects,
  // Key Memory Board, and Metrics Breakdown
  // =========================================================================

  doc.addPage();
  currentY = marginTop;

  // Top Accent Stripe on Appendices
  doc.setFillColor(217, 119, 6);
  doc.rect(0, 0, pageWidth, 4, "F");

  // Section Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(24, 24, 27);
  doc.text("Session Intelligence & Character Status Report", marginX, currentY);
  currentY += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("End-of-Session Vitals, Scene Context, Key Memory Board & Comprehensive Relationship Metrics", marginX, currentY);
  currentY += 8;

  // ----------------------------------------------------
  // SECTION 1: VITALS & STATUS • MOOD & COMPOSURE
  // ----------------------------------------------------
  drawSectionBanner(doc, marginX, currentY, usableWidth, "Vitals & Physical Status • Mood & Composure", "Real-time physiological equilibrium, emotional tone, and stress threshold");
  currentY += 13.5;

  const stress = charState.stress;
  const composureScore = Math.max(0, 100 - stress);
  let composureRating = "Unshakeable & Resolute";
  if (stress >= 75) composureRating = "Critical Vulnerability & Overwhelmed";
  else if (stress >= 50) composureRating = "Agitated & Faltering";
  else if (stress >= 25) composureRating = "Steady & Guarded";

  const vitalsCardHeight = 44;
  ensureSpace(vitalsCardHeight);

  doc.setFillColor(254, 252, 246); // Warm Amber 50
  doc.setDrawColor(252, 211, 77); // Amber 300
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, currentY, usableWidth, vitalsCardHeight, 2, 2, "FD");

  const colWidth = (usableWidth - 14) / 2;
  const leftColX = marginX + 4;
  const rightColX = marginX + colWidth + 10;
  let gaugeY = currentY + 6;

  // Left Column: Physical Vitals
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(180, 83, 9); // Amber 800
  doc.text("PHYSICAL VITALS & MUTUAL TRUST", leftColX, gaugeY);
  gaugeY += 5.5;

  drawGaugeBar(doc, leftColX, gaugeY, colWidth, "Vitality (Health)", charState.health, [239, 68, 68]);
  gaugeY += 9;
  drawGaugeBar(doc, leftColX, gaugeY, colWidth, "Energy (Stamina)", charState.stamina, [245, 158, 11]);
  gaugeY += 9;
  drawGaugeBar(doc, leftColX, gaugeY, colWidth, "Mutual Trust", charState.trust, [168, 85, 247]);

  // Right Column: Mood & Composure
  let moodColY = currentY + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(180, 83, 9);
  doc.text("MOOD & COMPOSURE SPECTRUM", rightColX, moodColY);
  moodColY += 5.5;

  // Active Mood Box
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text("Active Mood:", rightColX, moodColY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);
  const moodValStr = charState.mood || "Neutral";
  const moodValWidth = usableWidth - (rightColX - marginX) - 24;
  const truncMood = doc.splitTextToSize(moodValStr, moodValWidth)[0] || moodValStr;
  doc.text(truncMood, rightColX + 22, moodColY);
  moodColY += 6.5;

  drawGaugeBar(doc, rightColX, moodColY, colWidth, "Stress Factor", charState.stress, [244, 63, 94]);
  moodColY += 9;
  drawGaugeBar(doc, rightColX, moodColY, colWidth, "Composure Level", composureScore, [16, 185, 129]);
  moodColY += 7.5;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Composure State: ${composureRating}`, rightColX, moodColY);

  currentY += vitalsCardHeight + 5;

  // ----------------------------------------------------
  // SECTION 2: SCENE & SETTING • ACTIVE STATUS EFFECTS
  // ----------------------------------------------------
  ensureSpace(42);
  drawSectionBanner(doc, marginX, currentY, usableWidth, "Scene & Setting Context • Active Status Effects", "Environmental location, ongoing activity, attire, and active roleplay status modifiers");
  currentY += 13.5;

  const sceneCardHeight = 36;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, currentY, usableWidth, sceneCardHeight, 2, 2, "FD");

  // Left Column: Scene & Setting
  let sceneLeftY = currentY + 5.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("ENVIRONMENT & SETTING", leftColX, sceneLeftY);
  sceneLeftY += 5;

  const sceneFields: { label: string; val: string }[] = [
    { label: "Location:", val: charState.location && charState.location !== "Unknown" ? charState.location : "Default Location" },
    { label: "Activity:", val: charState.activity && charState.activity !== "Idle" ? charState.activity : "Resting / Idle" },
    { label: "Outfit / Attire:", val: charState.outfit || "Casual attire" },
  ];

  sceneFields.forEach((item) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.8);
    doc.setTextColor(51, 65, 85);
    doc.text(item.label, leftColX, sceneLeftY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    const lblW = doc.getTextWidth(item.label) + 2;
    const maxValW = colWidth - lblW;
    const truncV = doc.splitTextToSize(item.val, maxValW)[0] || item.val;
    doc.text(truncV, leftColX + lblW, sceneLeftY);
    sceneLeftY += 5.2;
  });

  // Right Column: Active Status Effects
  let effectsRightY = currentY + 5.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`ACTIVE STATUS EFFECTS (${charState.statusEffects.length})`, rightColX, effectsRightY);
  effectsRightY += 5;

  if (charState.statusEffects.length > 0) {
    charState.statusEffects.slice(0, 4).forEach((eff) => {
      doc.setFillColor(254, 243, 199); // Amber 100
      doc.setDrawColor(251, 191, 36); // Amber 400
      doc.roundedRect(rightColX, effectsRightY - 3, colWidth, 4.8, 1, 1, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(180, 83, 9);
      const effTrunc = doc.splitTextToSize(`✦ ${eff}`, colWidth - 4)[0] || eff;
      doc.text(effTrunc, rightColX + 2.5, effectsRightY + 0.4);
      effectsRightY += 5.5;
    });
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Stable — No active status effects or afflictions.", rightColX, effectsRightY + 2);
  }

  currentY += sceneCardHeight + 6;

  // ----------------------------------------------------
  // SECTION 3: RELATIONSHIP METRICS BREAKDOWN
  // ----------------------------------------------------
  ensureSpace(70);
  drawSectionBanner(doc, marginX, currentY, usableWidth, "Relationship Metrics Breakdown & Emotional Dynamics", "Quantified interpersonal bond, trust, familiarity, chemistry, and emotional dynamics");
  currentY += 13.5;

  // Top Stage & Bond Hero Banner
  const heroCardHeight = 25;
  doc.setFillColor(253, 242, 248); // Pink/Rose 50
  doc.setDrawColor(244, 114, 182); // Pink 400
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, currentY, usableWidth, heroCardHeight, 2, 2, "FD");

  // Left side: Stage
  let heroTextY = currentY + 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(190, 24, 93); // Rose 700
  doc.text(`Stage: ${metrics.stage}`, marginX + 4, heroTextY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(157, 23, 77);
  doc.text(metrics.stageSubtitle || "Evolving dynamic connection", marginX + 4, heroTextY + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const descLines = doc.splitTextToSize(metrics.stageDescription || "", usableWidth - 42);
  doc.text(descLines.slice(0, 2), marginX + 4, heroTextY + 9);

  // Right side: Harmonic Bond Circle/Badge
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(244, 114, 182);
  doc.roundedRect(marginX + usableWidth - 36, currentY + 3.5, 32, 18, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(157, 23, 77);
  doc.text("HARMONIC BOND", marginX + usableWidth - 34, currentY + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(225, 29, 72); // Rose 600
  doc.text(`${metrics.overallBondScore}%`, marginX + usableWidth - 28, currentY + 16.5);

  currentY += heroCardHeight + 4;

  // 4 Core Interpersonal Gauges
  const coreGaugesHeight = 24;
  ensureSpace(coreGaugesHeight);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, currentY, usableWidth, coreGaugesHeight, 2, 2, "FD");

  let cgY = currentY + 6;
  drawGaugeBar(doc, leftColX, cgY, colWidth, "Affinity & Warmth", metrics.affinityScore, [244, 63, 94]);
  drawGaugeBar(doc, rightColX, cgY, colWidth, "Mutual Trust & Secrets", metrics.trustScore, [168, 85, 247]);
  cgY += 9;
  drawGaugeBar(doc, leftColX, cgY, colWidth, "Familiarity & Recalls", metrics.familiarityScore, [16, 185, 129]);
  drawGaugeBar(doc, rightColX, cgY, colWidth, "Chemistry & Banter", metrics.chemistryScore, [245, 158, 11]);

  currentY += coreGaugesHeight + 4;

  // Emotional Dynamics Spectrum
  if (metrics.emotionalDynamics && metrics.emotionalDynamics.length > 0) {
    const dynCardHeight = 28;
    ensureSpace(dynCardHeight);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginX, currentY, usableWidth, dynCardHeight, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("EMOTIONAL DYNAMICS SPECTRUM", marginX + 4, currentY + 5);

    const halfDyn = Math.ceil(metrics.emotionalDynamics.length / 2);
    const leftDyn = metrics.emotionalDynamics.slice(0, halfDyn);
    const rightDyn = metrics.emotionalDynamics.slice(halfDyn);

    let dynY = currentY + 10.5;
    leftDyn.forEach((trait) => {
      drawGaugeBar(doc, leftColX, dynY, colWidth, trait.trait, trait.score, [14, 165, 233]);
      dynY += 7.5;
    });

    dynY = currentY + 10.5;
    rightDyn.forEach((trait) => {
      drawGaugeBar(doc, rightColX, dynY, colWidth, trait.trait, trait.score, [14, 165, 233]);
      dynY += 7.5;
    });

    currentY += dynCardHeight + 4;
  }

  // Knowledge Vault (What character knows about user / user knows about character)
  const hasKnownUser = metrics.knownAboutUser && metrics.knownAboutUser.length > 0;
  const hasKnownChar = metrics.knownAboutPersonality && metrics.knownAboutPersonality.length > 0;

  if (hasKnownUser || hasKnownChar) {
    const vaultHeight = 36;
    ensureSpace(vaultHeight);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginX, currentY, usableWidth, vaultHeight, 2, 2, "FD");

    // Left: Known About User
    let kvLeftY = currentY + 5.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9);
    doc.text(`WHAT ${charName.toUpperCase()} RECALLS ABOUT YOU`, leftColX, kvLeftY);
    kvLeftY += 4.5;

    const userFacts = hasKnownUser ? metrics.knownAboutUser.slice(0, 4) : ["No personal disclosures recorded yet."];
    userFacts.forEach((f) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const truncFact = doc.splitTextToSize(`• ${f}`, colWidth - 2)[0] || f;
      doc.text(truncFact, leftColX, kvLeftY);
      kvLeftY += 4.2;
    });

    // Right: Known About Character
    let kvRightY = currentY + 5.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(190, 24, 93);
    doc.text(`WHAT YOU HAVE DISCOVERED ABOUT ${charName.toUpperCase()}`, rightColX, kvRightY);
    kvRightY += 4.5;

    const charFacts = hasKnownChar ? metrics.knownAboutPersonality.slice(0, 4) : ["No character secrets unsealed yet."];
    charFacts.forEach((f) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const truncFact = doc.splitTextToSize(`• ${f}`, colWidth - 2)[0] || f;
      doc.text(truncFact, rightColX, kvRightY);
      kvRightY += 4.2;
    });

    currentY += vaultHeight + 5;
  }

  // ----------------------------------------------------
  // SECTION 4: KEY MEMORY BOARD (MEMPALACE)
  // ----------------------------------------------------
  ensureSpace(60);
  drawSectionBanner(doc, marginX, currentY, usableWidth, "Metrics Key Memory Board & MemPalace Repository", "Archived memories, verified facts, pivotal roleplay discoveries, and verbatim quotes");
  currentY += 13.5;

  // Summary Pill Strip
  const totalDrawers = palace.drawers?.length || 0;
  const totalWings = palace.wings?.length || 0;
  const totalRecalls = metrics.totalRecalls || 0;

  const statsStripHeight = 12;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, currentY, usableWidth, statsStripHeight, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`MEMPALACE LOCI: ${totalDrawers} Memories Anchored   |   ${totalWings} Architectural Wings   |   ${totalRecalls} Conversational Recalls`, marginX + 4, currentY + 7.5);

  currentY += statsStripHeight + 4;

  // Draw key memory cards (drawers)
  const drawers = palace.drawers || [];
  if (drawers.length > 0) {
    // Sort by importance descending
    const sortedDrawers = [...drawers].sort((a, b) => (b.importance || 5) - (a.importance || 5)).slice(0, 8);

    sortedDrawers.forEach((drawer, dIdx) => {
      const cardInnerW = usableWidth - 8;
      const contentLines = doc.splitTextToSize(cleanMarkdownForPdf(drawer.content), cardInnerW);
      const quoteLines = drawer.verbatimQuote ? doc.splitTextToSize(`"${cleanMarkdownForPdf(drawer.verbatimQuote)}"`, cardInnerW - 6) : [];

      const cardH = 12 + contentLines.length * 3.8 + (quoteLines.length > 0 ? quoteLines.length * 3.5 + 5 : 0);
      ensureSpace(cardH);

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(marginX, currentY, usableWidth, cardH, 1.5, 1.5, "FD");

      // Left hall indicator bar
      doc.setFillColor(getHallColor(drawer.hall)[0], getHallColor(drawer.hall)[1], getHallColor(drawer.hall)[2]);
      doc.roundedRect(marginX, currentY, 2, cardH, 1, 1, "F");

      // Header row inside card
      let memY = currentY + 4.5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(getHallColor(drawer.hall)[0], getHallColor(drawer.hall)[1], getHallColor(drawer.hall)[2]);
      doc.text(`[${(drawer.hall || "MEMORY").toUpperCase()}]`, marginX + 5, memY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      const locusStr = `Locus: ${drawer.wing || "Grand Hall"} • ${drawer.room || "Chamber"}`;
      doc.text(locusStr, marginX + 26, memY);

      const impStr = `Importance: ★ ${drawer.importance || 5}/10`;
      const impW = doc.getTextWidth(impStr);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(180, 83, 9);
      doc.text(impStr, marginX + usableWidth - impW - 4, memY);

      memY += 4.5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      contentLines.forEach((line: string) => {
        doc.text(line, marginX + 5, memY);
        memY += 3.8;
      });

      // Quote if present
      if (quoteLines.length > 0) {
        memY += 1.5;
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(marginX + 5, memY - 2.5, cardInnerW, quoteLines.length * 3.5 + 4, 1, 1, "F");

        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        quoteLines.forEach((qLine: string) => {
          doc.text(qLine, marginX + 8, memY + 1);
          memY += 3.5;
        });
      }

      currentY += cardH + 3.5;
    });
  } else {
    ensureSpace(16);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginX, currentY, usableWidth, 14, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text("No memories anchored in the MemPalace memory bank for this character yet.", marginX + 6, currentY + 8.5);
    currentY += 18;
  }

  // ----------------------------------------------------
  // Headers & Footers across ALL generated pages
  // ----------------------------------------------------
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Header on pages > 1
    if (i > 1) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // Slate 400
      doc.text(`${charName} & ${userName} • Roleplay Transcript`, marginX, 12);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(marginX, 14, pageWidth - marginX, 14);
    }

    // Footer on all pages
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

    const pageNumStr = `Page ${i} of ${totalPages}`;
    const pageNumWidth = doc.getTextWidth(pageNumStr);
    const footerTitle = `Chat transcript between ${charName} and ${userName}`;
    const maxFooterWidth = pageWidth - marginX * 2 - pageNumWidth - 8;
    const truncatedFooter = doc.splitTextToSize(footerTitle, maxFooterWidth)[0] || footerTitle;
    doc.text(truncatedFooter, marginX, pageHeight - 7);
    doc.text(pageNumStr, pageWidth - marginX - pageNumWidth, pageHeight - 7);
  }

  // Generate safe sanitized filename
  const safeCharName = charName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const dateSlug = new Date().toISOString().slice(0, 10);
  const filename = `${safeCharName}_Chat_Transcript_${dateSlug}.pdf`;

  // Download directly in browser
  doc.save(filename);

  return {
    success: true,
    filename,
    turnCount: validMessages.length,
  };
}

/**
 * Renders a stylized section banner.
 */
function drawSectionBanner(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  title: string,
  subtitle?: string
) {
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, width, 11, 1.5, 1.5, "FD");

  doc.setFillColor(217, 119, 6); // Amber
  doc.roundedRect(x, y, 2, 11, 1, 1, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(title, x + 4.5, y + 4.8);

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, x + 4.5, y + 8.8);
  }
}

/**
 * Draws a standardized progress gauge bar.
 */
function drawGaugeBar(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  score: number,
  color: [number, number, number]
) {
  const safeScore = Math.max(0, Math.min(100, typeof score === "number" ? score : 0));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  doc.text(label, x, y);

  const scoreStr = `${safeScore}%`;
  const scoreWidth = doc.getTextWidth(scoreStr);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(scoreStr, x + width - scoreWidth, y);

  // Background track
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(x, y + 1.6, width, 2.4, 1.2, 1.2, "F");

  // Fill bar
  if (safeScore > 0) {
    doc.setFillColor(color[0], color[1], color[2]);
    const fillWidth = Math.max(2, (width * safeScore) / 100);
    doc.roundedRect(x, y + 1.6, fillWidth, 2.4, 1.2, 1.2, "F");
  }
}

/**
 * Returns RGB tuple for each memory hall category.
 */
function getHallColor(hall?: string): [number, number, number] {
  switch (hall) {
    case "facts":
      return [16, 185, 129]; // Emerald
    case "events":
      return [245, 158, 11]; // Amber
    case "discoveries":
      return [14, 165, 233]; // Sky
    case "preferences":
      return [168, 85, 247]; // Purple
    default:
      return [100, 116, 139]; // Slate
  }
}

/**
 * Helper to draw an individual message card bubble with color accents.
 */
function renderMessageCard(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  padding: number,
  isUser: boolean,
  speakerName: string,
  turnBadge: string,
  lines: string[],
  lineHeight: number,
  includeHeader: boolean
) {
  if (isUser) {
    // User Card: Slate / Soft Indigo
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(203, 213, 225); // Slate 300
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, width, height, 2, 2, "FD");

    // Left accent bar
    doc.setFillColor(79, 70, 229); // Indigo 600
    doc.roundedRect(x, y, 1.5, height, 1, 1, "F");
  } else {
    // Character Card: Warm Amber / Parchment Tint
    doc.setFillColor(254, 252, 246); // Warm Amber 50
    doc.setDrawColor(252, 211, 77); // Amber 300
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, width, height, 2, 2, "FD");

    // Left accent bar
    doc.setFillColor(217, 119, 6); // Amber 600
    doc.roundedRect(x, y, 1.5, height, 1, 1, "F");
  }

  let textStartY = y + padding + 3.5;

  if (includeHeader) {
    // Speaker Badge / Name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    if (isUser) {
      doc.setTextColor(67, 56, 202); // Indigo 700
    } else {
      doc.setTextColor(180, 83, 9); // Amber 700
    }
    doc.text(speakerName, x + padding + 2.5, textStartY);

    // Turn Counter badge (right aligned inside card)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate 400
    const turnBadgeWidth = doc.getTextWidth(turnBadge);
    doc.text(turnBadge, x + width - padding - turnBadgeWidth, textStartY);

    textStartY += 4.8;
  }

  // Message Content
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.8);
  doc.setTextColor(30, 41, 59); // Slate 800

  for (let i = 0; i < lines.length; i++) {
    doc.text(lines[i], x + padding + 2.5, textStartY + i * lineHeight);
  }
}

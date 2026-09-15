const fs = require('fs');
const content = fs.readFileSync('src/localServerEngine.ts', 'utf8');

const replacement = `
  const baseUrl = cleanUrl(matchedServer.baseUrl);
  const headers = getRequestHeaders(matchedServer);
  const temperature = options?.temperature ?? matchedServer.temperature ?? settings.defaultTemperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? matchedServer.maxTokens ?? settings.defaultMaxTokens ?? 2048;

  const buildOpenAiBody = () => {
    const body: any = {
      model: rawModelName,
      messages,
      temperature,
      max_tokens: maxTokens,
      top_p: options?.topP ?? 1.0,
      frequency_penalty: options?.frequencyPenalty ?? 0.0,
      presence_penalty: options?.presencePenalty ?? 0.0,
      stream: false,
    };
    if (options?.logitBias && Object.keys(options.logitBias).length > 0) body.logit_bias = options.logitBias;
    if (options?.minP) body.min_p = options.minP;
    if (options?.topK) body.top_k = options.topK;
    if (options?.repetitionPenalty) body.repetition_penalty = options.repetitionPenalty;
    if (options?.dryMultiplier) {
      body.dry_multiplier = options.dryMultiplier;
      body.dry_base = options.dryBase;
      body.dry_allowed_length = options.dryAllowedLength;
      body.dry_sequence_breakers = options.drySequenceBreakers;
    }
    return body;
  };

  // Jan execution
  if (matchedServer.type === "jan") {
    const chatUrl = baseUrl.endsWith("/v1") ? \`\${baseUrl}/chat/completions\` : \`\${baseUrl}/v1/chat/completions\`;
    const body = buildOpenAiBody();

    let response = await fetch(chatUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    }).catch((e) => {
      throw new Error(\`Failed to communicate with Jan API Server at \${baseUrl}: \${e.message}. Verify Jan is running on port 1337.\`);
    });

    if (!response.ok) {
      const altUrl = \`\${baseUrl}/chat/completions\`;
      response = await fetch(altUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      }).catch((e) => {
        throw new Error(\`Jan server error (\${response?.status}): \${e.message}\`);
      });
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(\`Jan server returned HTTP \${response.status}: \${errText || "Check selected model in Jan"}\`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }

  // Ollama execution
  if (matchedServer.type === "ollama") {
    const chatUrl = \`\${baseUrl}/api/chat\`;
    const body: any = {
      model: rawModelName,
      messages,
      options: {
        temperature,
        num_predict: maxTokens,
        top_p: options?.topP ?? 1.0,
        top_k: options?.topK ?? 40,
        presence_penalty: options?.presencePenalty ?? 0.0,
        frequency_penalty: options?.frequencyPenalty ?? 0.0,
        repeat_penalty: options?.repetitionPenalty ?? 1.1,
        min_p: options?.minP ?? 0.05,
        mirostat: options?.mirostat ?? 0,
        mirostat_tau: options?.mirostatTau ?? 5.0,
        mirostat_eta: options?.mirostatEta ?? 0.1,
        tfs_z: options?.tfsZ ?? 1.0,
      },
      stream: false,
    };

    const response = await fetch(chatUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    }).catch((e) => {
      throw new Error(\`Failed to communicate with Ollama at \${baseUrl}: \${e.message}\`);
    });

    if (!response.ok) {
      const openAiUrl = baseUrl.endsWith("/v1") ? \`\${baseUrl}/chat/completions\` : \`\${baseUrl}/v1/chat/completions\`;
      const altRes = await fetch(openAiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(buildOpenAiBody()),
        signal: AbortSignal.timeout(60000),
      }).catch(() => null);

      if (altRes && altRes.ok) {
        const altData = await altRes.json();
        return altData.choices?.[0]?.message?.content || "";
      }

      const errText = await response.text().catch(() => "");
      throw new Error(\`Ollama returned HTTP \${response.status}: \${errText}\`);
    }

    const data = await response.json();
    return data.message?.content || "";
  }

  // LM Studio & Custom OpenAI execution
  const chatUrl = baseUrl.endsWith("/v1") ? \`\${baseUrl}/chat/completions\` : \`\${baseUrl}/v1/chat/completions\`;
  const body = buildOpenAiBody();

  const response = await fetch(chatUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  }).catch((e) => {
    throw new Error(\`Failed to communicate with \${matchedServer?.name || "Local Server"} at \${baseUrl}: \${e.message}\`);
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(\`\${matchedServer.name} returned HTTP \${response.status}: \${errText}\`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}
`;

const startIndex = content.indexOf('  const baseUrl = cleanUrl(matchedServer.baseUrl);');
const endIndex = content.indexOf('}', startIndex + 100);

let finalContent = content.substring(0, startIndex) + replacement;

fs.writeFileSync('src/localServerEngine.ts', finalContent, 'utf8');

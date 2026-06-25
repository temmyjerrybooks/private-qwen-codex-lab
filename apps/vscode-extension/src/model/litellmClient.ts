import { ChatCompletionResponse, ChatMessage } from "./types";

export interface OpenAICompatibleEndpoint {
  baseUrl: string;
  model: string;
  label?: string;
}

export class LiteLLMClient {
  constructor(
    private readonly endpoint: OpenAICompatibleEndpoint,
    private readonly apiKey?: string
  ) {}

  async testConnection(): Promise<string> {
    return this.chat([
      { role: "system", content: "You are a connection test responder." },
      { role: "user", content: "Reply with exactly: Borger connection OK" }
    ]);
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const url = `${this.endpoint.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
      },
      body: JSON.stringify({
        model: this.endpoint.model,
        messages,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`LiteLLM request failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    return data.choices?.[0]?.message?.content ?? "No response content returned.";
  }
}

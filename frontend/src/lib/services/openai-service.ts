import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const ProductInfo = z.object({
  brand: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
  area: z.string().nullable().optional(),
});

const TreatmentExtraction = z.object({
  customer_name: z.string().nullable().optional(),
  service_type: z.string().nullable().optional(),
  products_used: z.array(ProductInfo).nullable().optional(),
  area: z.string().nullable().optional(),
  duration_minutes: z.number().nullable().optional(),
  satisfaction: z.string().nullable().optional(),
  next_visit_recommendation: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
});

export type TreatmentExtractionResult = z.infer<typeof TreatmentExtraction>;

export async function transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string> {
  const file = new File([new Uint8Array(audioBuffer)], filename, { type: "audio/webm" });
  console.log(`[transcribeAudio] 파일 생성: ${filename}, size: ${audioBuffer.length} bytes`);

  const transcription = await getOpenAI().audio.transcriptions.create({
    model: "whisper-1",
    file,
    language: "ko",
  });

  console.log(`[transcribeAudio] 변환 결과: "${transcription.text}"`);

  if (!transcription.text || transcription.text.trim().length === 0) {
    throw new Error("음성이 인식되지 않았습니다. 더 크게 말하거나 더 길게 녹음해주세요.");
  }

  return transcription.text;
}

export async function extractTreatmentInfo(transcript: string): Promise<TreatmentExtractionResult> {
  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "당신은 한국 미용실 시술 기록 전문 AI 어시스턴트입니다. " +
          "음성 메모 텍스트에서 시술 정보를 정확하게 추출하세요. " +
          "브랜드명과 제품 코드를 정확히 구분하세요. " +
          "예: '로레알 7.1' → brand='로레알', code='7.1'" +
          "\n\n반드시 JSON 형식으로 응답하세요.",
      },
      {
        role: "user",
        content: `다음 음성 메모에서 시술 정보를 추출해주세요:\n\n${transcript}`,
      },
    ],
    response_format: zodResponseFormat(TreatmentExtraction, "treatment_extraction"),
  });
  const content = completion.choices[0].message.content;
  return TreatmentExtraction.parse(JSON.parse(content || "{}"));
}

export async function transcribeAndExtract(audioBuffer: Buffer, filename: string): Promise<TreatmentExtractionResult> {
  const transcript = await transcribeAudio(audioBuffer, filename);
  return extractTreatmentInfo(transcript);
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { dados_do_paciente, num_refeicoes } = await req.json()
    
    // Retrieve API Key from Deno Environment
    const apiKey = Deno.env.get('GOOGLE_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GOOGLE_API_KEY não configurada nas variáveis de ambiente do Supabase.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const numRefeicoes = num_refeicoes ? parseInt(String(num_refeicoes)) : 5;

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    })

    const getRefeicoesTemplate = (n: number) => {
      if (n === 3) {
        return `{
          "cafe_da_manha": ["Opção 1", "Opção 2", "Opção 3", "Opção 4", "Opção 5"],
          "almoco": ["Opção 1", "Opção 2", "Opção 3", "Opção 4", "Opção 5"],
          "jantar": ["Opção 1", "Opção 2", "Opção 3", "Opção 4", "Opção 5"]
        }`;
      }
      if (n === 4) {
        return `{
          "cafe_da_manha": ["Opção 1", "Opção 2", "Opção 3", "Opção 4", "Opção 5"],
          "almoco": ["Opção 1", "Opção 2", "Opção 3", "Opção 4", "Opção 5"],
          "lanche_tarde": ["Opção 1", "Opção 2", "Opção 3", "Opção 4", "Opção 5"],
          "jantar": ["Opção 1", "Opção 2", "Opção 3", "Opção 4", "Opção 5"]
        }`;
      }
      return `{
        "cafe_da_manha": ["Opção 1", "Opção 2", "Opção 3", "Opção 4", "Opção 5"],
        "lanche_manha": ["Opção 1", "Opção 2", "Opção 3", "Opção 4", "Opção 5"],
        "almoco": ["Opção 1", "Opção 2", "Opção 3", "Opção 4", "Opção 5"],
        "lanche_tarde": ["Opção 1", "Opção 2", "Opção 3", "Opção 4", "Opção 5"],
        "jantar": ["Opção 1", "Opção 2", "Opção 3", "Opção 4", "Opção 5"]
      }`;
    };

    const prompt = `Você é um nutricionista clínico profissional especialista na culinária e rotina brasileira.
Gere um plano alimentar semanal completo, saudável e diversificado com exatamente ${numRefeicoes} refeições diárias com base nos dados do paciente fornecidos abaixo.

Dados do Paciente (Metas, Alergias, Restrições e Histórico):
${typeof dados_do_paciente === 'string' ? dados_do_paciente : JSON.stringify(dados_do_paciente, null, 2)}

⚠️ Regras Críticas de Execução:
- Você deve responder APENAS e estritamente o objeto JSON solicitado.
- Não inclua blocos de código markdown (como \`\`\`json ... \`\`\`), explicações, introduções ou textos complementares.
- Adapte o cardápio rigorosamente a quaisquer alergias ou restrições descritas nos dados.
- Utilize alimentos comuns, acessíveis e culturalmente aceitos no Brasil.
- Evite repetições monótonas de alimentos nos dias seguidos.
- Cada dia da semana DEVE conter exatamente e apenas as ${numRefeicoes} refeições especificadas no JSON modelo abaixo. Não invente outras chaves de refeição.

O formato do JSON retornado deve seguir exatamente esta estrutura:
{
  "plano_semanal": [
    {
      "dia": "Segunda-feira",
      "refeicoes": ${getRefeicoesTemplate(numRefeicoes)}
    },
    {
      "dia": "Terça-feira",
      "refeicoes": ${getRefeicoesTemplate(numRefeicoes)}
    },
    {
      "dia": "Quarta-feira",
      "refeicoes": ${getRefeicoesTemplate(numRefeicoes)}
    },
    {
      "dia": "Quinta-feira",
      "refeicoes": ${getRefeicoesTemplate(numRefeicoes)}
    },
    {
      "dia": "Sexta-feira",
      "refeicoes": ${getRefeicoesTemplate(numRefeicoes)}
    },
    {
      "dia": "Sábado",
      "refeicoes": ${getRefeicoesTemplate(numRefeicoes)}
    },
    {
      "dia": "Domingo",
      "refeicoes": ${getRefeicoesTemplate(numRefeicoes)}
    }
  ]
}`;

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    return new Response(
      text,
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Erro desconhecido na geração do plano.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

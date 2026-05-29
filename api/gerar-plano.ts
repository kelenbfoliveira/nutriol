import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { dados_do_paciente, num_refeicoes } = req.body;
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'GOOGLE_API_KEY não configurada no ambiente.' });
    }

    const numRefeicoes = num_refeicoes ? parseInt(String(num_refeicoes)) : 5;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

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

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return res.status(200).json(JSON.parse(text));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
  }
}

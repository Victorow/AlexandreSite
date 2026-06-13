// Pure functions — fully testable without DOM or Angular

export const LGPD_TERM_VERSION = '1.0';

export const LGPD_TERM_TEXT = `
TERMO DE CONSENTIMENTO PARA TRATAMENTO DE DADOS PESSOAIS
(Lei Geral de Proteção de Dados — Lei nº 13.709/2018)

Versão ${LGPD_TERM_VERSION}

CONTROLADOR DOS DADOS
O Personal Trainer responsável pelo atendimento, doravante denominado CONTROLADOR, declara estar ciente
das obrigações previstas na LGPD referentes ao tratamento dos dados coletados neste formulário.

1. DADOS COLETADOS
   Dados pessoais: nome completo, data de nascimento, sexo biológico, altura, telefone.
   Dados de saúde: histórico clínico, medicamentos, condições cardíacas e articulares.
   Dados biométricos: composição corporal, circunferências, dobras cutâneas e fotos de evolução.

2. FINALIDADE DO TRATAMENTO
   Os dados são coletados exclusivamente para fins de avaliação física, prescrição de treino
   e acompanhamento de evolução corporal. Não serão compartilhados com terceiros sem consentimento.

3. BASE LEGAL
   Consentimento do titular (Art. 7º, I) e execução de contrato de prestação de serviços (Art. 7º, V).

4. PRAZO DE ARMAZENAMENTO
   Os dados serão armazenados pelo período de vigência do contrato de personal training,
   podendo o titular solicitar exclusão a qualquer momento.

5. DIREITOS DO TITULAR
   Você tem direito a: confirmar o tratamento, acessar seus dados, solicitar correção,
   portabilidade, anonimização ou eliminação, e revogar o consentimento a qualquer tempo.

6. CANAL DE CONTATO
   Para exercer seus direitos ou obter esclarecimentos, entre em contato diretamente
   com seu Personal Trainer.

Ao assinar abaixo, o TITULAR declara ter lido, compreendido e concordado com os termos
acima, autorizando o tratamento de seus dados pessoais e de saúde para as finalidades descritas.
`.trim();

export function buildConsentRecord(alunoName: string, signedAt: Date, termVersion: string): string {
  return `Consentimento registrado — ${alunoName} — ${formatLgpdDate(signedAt)} — Versão do Termo: ${termVersion}`;
}

export function formatLgpdDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function isSignatureBase64Valid(base64: string): boolean {
  if (!base64 || typeof base64 !== 'string') return false;
  // Deve ser uma string base64 válida com tamanho mínimo (imagem não em branco)
  if (base64.length < 100) return false;
  // Verifica se só contém caracteres base64 válidos
  const b64Regex = /^[A-Za-z0-9+/]+=*$/;
  return b64Regex.test(base64);
}

export function extractBase64FromDataUrl(dataUrl: string): string {
  // Remove o prefixo "data:image/png;base64," e retorna só o base64
  const parts = dataUrl.split(',');
  return parts.length === 2 ? parts[1] : dataUrl;
}

export function isDataUrlSignatureEmpty(dataUrl: string): boolean {
  // Uma imagem PNG "em branco" gerada pelo canvas tem tamanho muito pequeno
  const base64 = extractBase64FromDataUrl(dataUrl);
  return base64.length < 200;
}

export function getLgpdStatusLabel(status: 'PENDING' | 'ACCEPTED'): string {
  return status === 'ACCEPTED' ? 'Consentimento Assinado' : 'Aceite Pendente';
}

export function getLgpdStatusColor(status: 'PENDING' | 'ACCEPTED'): string {
  return status === 'ACCEPTED' ? 'text-emerald-400' : 'text-amber-400';
}

export function getCurrentTermVersion(): string {
  return LGPD_TERM_VERSION;
}

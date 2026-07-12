# Checklist de Segurança / LGPD / Compliance — Onda KYC

Checklist operacional para cadastro, cofre, biometria e núcleo CNH da Sociedade Fênix.
Revisar antes de liberar feature sensível ou deploy.

## LGPD art. 11 (dados pessoais sensíveis)

- [ ] **Consentimento explícito e versionado** antes de coletar documento ou biometria (`ConsentPurpose`: documentos, biometria, etc.; versão em `CONSENT_TERM_VERSION`).
- [ ] Finalidade informada de forma clara (não genérica demais); sem reuso para marketing sem opt-in separado.
- [ ] **Minimização:** guardar só o necessário; não persistir selfie/vídeo cru além do fluxo de verificação.
- [ ] Biometria e documentos tratados como **sensíveis** (controle de acesso, criptografia, trilha).
- [ ] Direito de **revogação / exclusão** documentado e executável (cofre + sessão KYC + artefatos).
- [ ] Retenção limitada (`RETENTION_DAYS`: vault, biometria, sessão KYC, access log) + plano de expurgo.
- [ ] Nunca vender dados; nunca comissão de credor; base legal e controlador claros (tech vs advocacia parceira).

## Criptografia e cofre

- [ ] AES-256-GCM em repouso (`encryptBuffer` / `KEY_VAULTS_SECRET`).
- [ ] Magic bytes (não só extensão) no upload; MIME allowlist.
- [ ] Nome de arquivo aleatório (UUID); isolamento por cliente.
- [ ] Links de compartilhamento com expiração.
- [ ] Logs **sem** CPF completo (`maskCpf`), sem e-mail completo desnecessário, sem imagem/token.

## OWASP (baseline app)

- [ ] Auth: senha com **bcrypt cost ≥ 12**; sem senha em plaintext em produção.
- [ ] Sessão / `AUTH_SECRET` forte; cookies seguros em HTTPS.
- [ ] Upload: limite de tamanho, validação de conteúdo, sem path traversal.
- [ ] Webhooks de pagamento: **HMAC timing-safe** (`verifyWebhookSignature` AbacatePay) + **idempotência** por event id.
- [ ] Erros genéricos ao client; sem stack/PII em resposta.
- [ ] CSP / headers de segurança no edge (nginx/Next) quando aplicável.
- [ ] Sem secrets no git (`.env*.local`); keys só em env de deploy.

## KYC / biometria

- [ ] Provider plugável (`KYC_PROVIDER`); **mock sem key** para dev.
- [ ] Resultado de liveness/faceMatch **sem raw image** no JSON persistido/logado.
- [ ] Faixa amarela/vermelha: verificação facial **não** decide ato jurídico sozinha.
- [ ] WebAuthn/passkeys quando disponíveis; fallback documentado.

## Botão Fênix e responsabilidade jurídica

- [ ] Minutas (recurso de multa, peças Oficina) com marca de **revisão / Botão Fênix**.
- [ ] `requiresLawyerReview` quando faixa ≠ verde ou há minuta.
- [ ] Trilha de auditoria (`makeAudit` / `appendAudit`) em ações sensíveis.
- [ ] Princípio: *A IA prepara. O advogado decide. O sistema executa.*

## Canais públicos gratuitos

- [ ] Fluxos CNH/DETRAN, Receita, gov.br, CDT, consumidor.gov **sempre** citam canal público gratuito quando existir.
- [ ] Nunca ocultar alternativa gratuita para empurrar serviço pago.
- [ ] Nunca pedir senha gov.br / banco no chat.

## Compliance de conteúdo

- [ ] **Sem jurisprudência inventada** (sem REsp/STJ fictício).
- [ ] Menções a CTB/CDC/CPC rotuladas como orientativas — “confirme no texto vigente”.
- [ ] Sem promessa de resultado (“vamos ganhar”, “garantimos”).
- [ ] Sem urgência artificial / dark patterns de conversão.
- [ ] Separação OAB: Sociedade Fênix Tecnologia vs advocacia parceira.

## Gates de verificação

```bash
npm run typecheck
npm run test:agents   # smoke-agents + smoke-kyc
npm run test:kyc      # só KYC
npm run build
```

## Envs / keys tipicamente pendentes (não versionar)

| Env | Uso |
|-----|-----|
| `KEY_VAULTS_SECRET` | AES cofre |
| `AUTH_SECRET` | Auth.js |
| `FENIX_DATABASE_URL` | Postgres |
| `KYC_PROVIDER` / `DIDIT_API_KEY` / `AWS_*` | KYC real |
| `ABACATEPAY_API_KEY` / `ABACATEPAY_WEBHOOK_SECRET` | Pagamentos |
| `S3_*` | Storage cofre prod |
| `OCR_PROVIDER` / `OCR_API_KEY` | OCR cloud |
| `RECEITA_*` / `DETRAN_*` | Consultas oficiais plugáveis |

---

*Última revisão de checklist: Onda KYC · Subagente QA + Segurança/LGPD.*

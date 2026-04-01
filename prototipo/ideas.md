# Ideias de Design — Mapa Estratégico por Geohash (Zoox × Vivo)

## Referência Visual
- Fundo branco/cinza claro, estilo corporativo analítico
- Cores de quadrante: Verde (Oportunidade), Roxo (Fortaleza), Cinza (Expansão), Vermelho (Risco)
- Ficha de geohash com score de satisfação, share de mercado e estratégia recomendada
- Identidade Zoox: tipografia limpa, roxo como cor de destaque

---

<response>
<probability>0.07</probability>
<text>
## Opção A — "Data Intelligence Dashboard"

**Design Movement:** Corporate Data Visualization / Analytical Precision

**Core Principles:**
1. Dados em primeiro plano — o mapa ocupa 60% da tela, ficha lateral sempre visível
2. Hierarquia de informação clara — título > mapa > ficha > legenda
3. Contraste controlado — fundo branco puro, elementos com sombra sutil
4. Densidade informacional alta sem poluição visual

**Color Philosophy:**
- Background: #FFFFFF / #F8F9FA (branco e cinza muito claro)
- Accent primário: #7B2FBE (roxo Zoox)
- Quadrantes: Verde #4CAF50, Roxo #7B2FBE, Cinza #9E9E9E, Vermelho #E53935
- Texto: #1A1A2E (quase preto azulado)
- Bordas/linhas: #E0E0E0

**Layout Paradigm:**
- Header fixo com branding Zoox + título
- Corpo dividido: mapa à esquerda (70%) + painel lateral direito (30%)
- Painel lateral mostra ficha do geohash ao hover, ou legenda/diagnóstico quando sem hover
- Mapa usa Google Maps com overlay de polígonos geohash

**Signature Elements:**
1. Barra vertical roxa à esquerda do título (como nas referências)
2. Badge colorido de estratégia na ficha (ex: "RETENÇÃO (RISCO)" em vermelho)
3. Barras de progresso coloridas para score de satisfação por operadora

**Interaction Philosophy:**
- Hover sobre célula geohash → ficha aparece no painel lateral com animação suave
- Célula ativa fica com borda branca e elevação de opacidade
- Filtros de camada no topo do mapa (toggle por quadrante)

**Animation:**
- Fade-in suave (200ms) da ficha ao trocar de geohash
- Pulse sutil na célula ativa
- Barras de score animam ao aparecer (fill da esquerda para direita, 400ms)

**Typography System:**
- Display: "Space Grotesk" Bold — títulos e IDs de geohash
- Body: "Inter" Regular/Medium — dados e descrições
- Monospace: "JetBrains Mono" — códigos geohash
</text>
</response>

<response>
<probability>0.05</probability>
<text>
## Opção B — "Tactical War Room"

**Design Movement:** Dark Intelligence / Military Cartography

**Core Principles:**
1. Fundo escuro com mapa em modo noturno — sensação de sala de operações
2. Dados em neon suave — verde, roxo, vermelho brilhante sobre escuro
3. Grid explícito — geohashes como células de uma grade tática
4. Informação densa mas legível

**Color Philosophy:**
- Background: #0D1117 (quase preto)
- Mapa: estilo dark/night
- Quadrantes: Verde #00E676, Roxo #CE93D8, Cinza #546E7A, Vermelho #FF5252
- Texto: #E8EAF6
- Cards: #1C2333 com borda #2D3748

**Layout Paradigm:**
- Full-screen com mapa ocupando 100% do fundo
- Painel flutuante à direita para ficha do geohash
- Header transparente com blur

**Signature Elements:**
1. Scanlines sutis sobre o mapa (efeito CRT)
2. Coordenadas geográficas exibidas em monospace no rodapé
3. Indicador de "sinal" animado no geohash ativo

**Interaction Philosophy:**
- Hover → ficha flutua próxima ao cursor
- Célula ativa pulsa com glow colorido
- Transições com efeito de "scan"

**Animation:**
- Glow pulse nas células ativas
- Ficha aparece com slide-in da direita
- Números contam até o valor final (counter animation)

**Typography System:**
- Display: "Orbitron" — títulos e IDs
- Body: "Roboto Mono" — dados
</text>
</response>

<response>
<probability>0.08</probability>
<text>
## Opção C — "Clean Analytics" ← ESCOLHIDA

**Design Movement:** Modern Corporate Analytics / Precision Reporting

**Core Principles:**
1. Fidelidade às referências visuais fornecidas — branco, roxo Zoox, quadrantes coloridos
2. Mapa central com overlay de geohashes coloridos semitransparentes
3. Ficha lateral rica em dados com micro-visualizações
4. Tipografia clara e profissional sem excessos decorativos

**Color Philosophy:**
- Background: #FFFFFF com seções em #F5F5F7
- Roxo Zoox: #7C3AED (primary accent)
- Verde Oportunidade: #22C55E (com 40% alpha no mapa)
- Roxo Fortaleza: #7C3AED (com 40% alpha no mapa)
- Cinza Expansão: #94A3B8 (com 40% alpha no mapa)
- Vermelho Risco: #EF4444 (com 40% alpha no mapa)
- Azul Blindagem: #3B82F6 (com 40% alpha no mapa)
- Texto primário: #111827
- Texto secundário: #6B7280

**Layout Paradigm:**
- Header fixo: logo Zoox + título da página
- Corpo: mapa (65%) + painel lateral (35%)
- Painel lateral: ficha de geohash com dados completos
- Legenda e filtros abaixo do mapa

**Signature Elements:**
1. Barra vertical roxa à esquerda dos títulos de seção
2. Badge de estratégia com cor do quadrante
3. Donut chart para share de mercado
4. Barras coloridas para score de satisfação por operadora

**Interaction Philosophy:**
- Hover no mapa → ficha atualiza no painel lateral
- Célula hovered fica com borda branca e maior opacidade
- Filtros por quadrante toggleam camadas no mapa

**Animation:**
- Fade + slide suave (150ms) na ficha ao trocar de geohash
- Barras de score animam ao aparecer
- Hover nas células com transição de opacidade

**Typography System:**
- Display: "Space Grotesk" Bold/SemiBold — títulos
- Body: "DM Sans" Regular/Medium — dados e descrições
- Mono: "JetBrains Mono" — IDs de geohash
</text>
</response>

## Decisão Final: Opção C — "Clean Analytics"
Fidelidade às referências, mapa Google Maps com overlay de polígonos geohash, painel lateral com ficha rica.

# Log de Alterações (Changelog) - Aplicativo de Hábitos e Deveres

Este documento registra o histórico de desenvolvimento do aplicativo, listando todas as novas funcionalidades, melhorias de interface, ajustes de design e correções de bugs categorizadas por versão.

---

## [v1.2.0] — 21 de Maio de 2026
Esta atualização foca na simplificação da aba **Metas (Hábitos)**, tornando seu visual mais limpo e focado, além de reformular a experiência espiritual diária com versículos voltados para a vida pessoal e cotidiana.

### 🔄 Refatoração de Conteúdo & Recursos
*   **Devocional Diário Focado na Vida:** Substituição completa de todos os versículos do devocional diário. O foco foi alterado de conselhos conjugais/casal para reflexões de fé, força, sabedoria, ânimo e resiliência adequados à rotina e desafios individuais de vida (incluindo passagens icônicas como Filipenses 4:13, Salmos 23:1, Josué 1:9, Isaías 41:10, entre outros).

### 🎨 Melhorias Visuais & Interface do Usuário (UI/UX)
*   **Foco Total na Aba Metas:** Ocultação de toda a seção superior de métricas individuais quando o usuário estiver navegando pela aba de **Metas** (`nav === 'habits'`). Isso inclui:
    *   Remoção visual do nome do usuário e indicador "VOCÊ".
    *   Ocultação do contador e barra de progresso de **XP Total**.
    *   Remoção do indicador de **Streak (Ofensiva de Dias)** da tela nesta aba.
    *   Ocultação de todas as métricas correspondentes da pessoa parceira (quando houver).
*   **Ocultação de Recursos Econômicos na Aba Metas:**
    *   Remoção do contador visual de **Moedas (FlowCoins)** na aba Metas, mantendo o visual limpo para incentivar o progresso diário sem poluição de gamificação repetitiva.
    *   Surgimento contextualizado das moedas apenas nas abas onde estas são necessárias (ex: Recompensas, Loja ou Deveres).
*   **Remoção de Ranking e Rodapé na Aba Metas:**
    *   Ocultação do banner de comparação e ranking do relacionamento quando o usuário visualizar seus hábitos cotidianos, garantindo foco introspectivo em suas próprias metas.

---

## [v1.1.0] — 15 de Maio de 2026
Atualização voltada à interatividade em tempo real, gamificação saudável através de conquistas integradas e persistência de dados dinâmica utilizando a infraestrutura do Google Firebase.

### 🚀 Novas Funcionalidades
*   **Sincronização em Tempo Real (Firebase RTDB):** Implementação de persistência e atualização instantânea para os hábitos, deveres, progresso de XP e conquistas compartilhadas em casal.
*   **Sistema de Gamificação Ativa (FlowCoins & XP):**
    *   Introdução de acúmulo de XP para subir de nível através do cumprimento de obrigações diárias.
    *   Adição da mecânica de moedas virtuais para desbloqueio cooperativo de recompensas no painel de ajustes e casal.
*   **Controle Dinâmico de Ofensivas (Streaks):** Criação da rotina de cálculo de consistência diária baseado em fuso horário local e progresso acumulado ao longo da semana.

### 🩹 Correções de Bugs (Bug Fixes)
*   **Corretor de Fusos Horários na Ofensiva:** Correção de bugs de timezone onde a virada do dia redefinía streaks antes do tempo estimado pelo usuário de acordo com horários regionais.
*   **Sincronização de Convite de Casal:** Ajuste na reatividade do listener permanente que causava falha ou duplicidade ao conectar código de convite de parceiros simultaneamente.

---

## [v1.0.0] — 1 de Maio de 2026
Lançamento inicial da plataforma inteligente para o cultivo de hábitos saudáveis, organização de deveres cotidianos e fortalecimento de rotinas comuns através da tecnologia.

### 🚀 Funcionalidades Principais
*   **Gestão de Hábitos Recorrentes:** Cadastro, edição e acompanhamento de tarefas periódicas com agendamento inteligente por dias da semana.
*   **Painel Integrado de Estatísticas:** Visualização analítica do progresso individual e cooperativo, detalhando porcentagens de consistência, total de itens finalizados e métricas históricas.
*   **Central de Deveres (Tarefas Únicas):** Mapeamento, categorização e finalização rápida de deveres urgentes e eventuais.

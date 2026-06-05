# AC-Board-War-Game
This is a repository for the final assignment of the software architecture course. Our project is a game based on the board game War.

Estrutura de Arquivos:

kingdom-war/
├── index.html              ← entry HTML + CSS global + keyframes
├── package.json            ← React 18 + Vite 6 + TypeScript 5
├── vite.config.ts          ← chunk separado para svgData (8.8MB)
├── tsconfig.json
├── tsconfig.node.json
└── src/
    ├── main.tsx            ← ReactDOM.createRoot
    ├── App.tsx             ← router de telas (Setup→Game→GameOver)
    ├── types/index.ts
    ├── constants/index.ts
    ├── data/
    │   ├── territories.ts  ← adjacências + metadados + fortalezas
    │   └── svgData.ts      ← 31 SVGs + background embarcados
    ├── engine/
    │   ├── combat.ts       ← UC-10
    │   ├── cards.ts        ← UC-14
    │   ├── economy.ts      ← UC-05
    │   ├── turns.ts        ← UC-09
    │   ├── victory.ts      ← UC-11/12
    │   └── init.ts         ← UC-08
    ├── store/
    │   ├── reducer.ts
    │   ├── persistence.ts  ← LocalStorage UC-07
    │   └── GameContext.tsx
    └── components/
        ├── SetupScreen.tsx ← UC-01
        ├── GameScreen.tsx
        ├── MapView.tsx     ← SVG interativo 31 territórios
        ├── HUD.tsx         ← timer + fase + jogador ativo
        ├── PlayerBar.tsx   ← stats todos jogadores
        └── ActionPanel.tsx ← distribuição/ataque/upgrades/cartas/objetivo
        
Inicializar o jogo:
# 1. Extraia o .tar.gz
tar -xzf kingdom-war.tar.gz
cd kingdom-war

# 2. Instale dependências
npm install

# 3. Rode em desenvolvimento
npm run dev
# Abre automaticamente em http://localhost:5173

# 4. Build de produção (opcional)
npm run build
npm run preview      
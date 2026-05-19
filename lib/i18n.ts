export type Lang = 'en' | 'pt'

export const t = {
  en: {
    // Header
    tagline: 'Otelie Studio',
    title: 'Design concept\nfor your space',
    subtitle: 'Answer a few questions and get a complete design concept in seconds.',
    footer: 'Otelie Studio · Powered by OpenAI',

    // Sections
    sYourSpace: 'Your space',
    sProfile: 'Profile',
    sCafeProfile: 'Café Profile',
    sBistroProfile: 'Bistro Profile',
    sSorveteriaProfile: 'Ice Cream Shop Profile',
    sDimensions: 'Dimensions',
    sSpaceReading: 'Space reading',
    sFinishes: 'Current finishes',
    s3dModel: '3D Space Model',
    sRenovation: 'Renovation',
    sIdentity: 'Identity',

    // Fields
    fType: 'Type',
    fCurrentState: 'Current state',
    fLocation: 'Location',
    fServiceModel: 'Service model',
    fMainFeature: 'Main feature',
    fOutdoor: 'Outdoor area',
    fCulinary: 'Culinary inspiration',
    fServicePeriod: 'Main service period',
    fSpecialFeature: 'Special feature',
    fProductType: 'Product type',
    fConsumption: 'Consumption model',
    fVisualHighlight: 'Visual highlight',
    fFloorDimensions: 'Floor dimensions',
    fOptional: '— optional',
    fLength: 'Length',
    fWidth: 'Width',
    fArea: 'Approximate area',
    fAutoCalc: 'auto-calculated',
    fCeilingHeight: 'Ceiling height',
    fNaturalLight: 'Natural light',
    fCapacity: 'Desired capacity',
    fFloorShape: 'Floor plan shape',
    fWindowPos: 'Window position',
    fStorefront: 'Storefront',
    fEntrance: 'Main entrance',
    fFixedElements: 'Fixed elements',
    fFixedElementsNote: '— select all that apply',
    fCurrentFloor: 'Current floor',
    fCurrentWalls: 'Current walls',
    fCurrentCeiling: 'Current ceiling',
    fKeeping: 'Keeping',
    fReplacing: 'Replacing',
    fBudget: 'Budget',
    fPriority: 'Priority',
    fDesiredStyle: 'Desired style',
    fTargetAudience: 'Target audience',
    fNotes: 'Notes',
    fOtelieEye: 'Otelie Eye',
    fOtelieEyeDesc: 'What the AI should preserve, avoid or prioritize in the generated image.',

    // Space types
    oCafe: 'Café',
    oBistro: 'Bistro',
    oIceCream: 'Ice Cream Shop',

    // Current state
    oShell: 'Shell / raw space',
    oOperating: 'Currently operating',
    oRefresh: 'Needs a refresh',

    // Location
    oUrban: 'Urban storefront',
    oMall: 'Mall / shopping center',
    oNeighborhood: 'Neighborhood street',
    oOther: 'Other',

    // Café
    oCounter: 'Counter / takeaway — walk-up coffee service',
    oSeating: 'Seating — space to sit and stay',
    oHybrid: 'Hybrid — counter up front, seating in the back',
    oEspresso: 'Espresso bar — barista and machine as centerpiece',
    oPastry: 'Pastry display — cakes, bread and pastries on show',
    oBoth: 'Both — specialty coffee meets bakery',
    oOutdoorYes: 'Yes, patio or sidewalk seating',
    oOutdoorNo: 'No outdoor area',

    // Bistro
    oFrench: 'French / European',
    oItalian: 'Italian',
    oMediterranean: 'Mediterranean',
    oContemporary: 'Contemporary California',
    oLunch: 'Lunch',
    oDinner: 'Dinner',
    oAllDay: 'All day',
    oBrunch: 'Brunch',
    oWineBar: 'Wine bar — cellar and wine list front and center',
    oOpenKitchen: 'Open kitchen — visible to guests',
    oNoFeature: 'No specific feature',

    // Sorveteria
    oGelato: 'Artisan gelato',
    oSoft: 'Soft serve',
    oAcai: 'Açaí bowls',
    oMix: 'Mixed',
    oTakeaway: 'Takeaway',
    oDineIn: 'Dine-in seating',
    oKids: 'Kids friendly',
    oMixed: 'Mixed',
    oDisplayCase: 'Display case',
    oVisibleProduction: 'Visible production',
    oToppingBar: 'Topping bar',
    oNoHighlight: 'No specific highlight',

    // Ceiling height
    oLow: 'Under 8 ft',
    oMedium: '8 to 11 ft',
    oHigh: 'Above 11 ft',
    oLowLabel: '↳ low',
    oMediumLabel: '↳ medium',
    oHighLabel: '↳ high',

    // Natural light
    oLots: 'Lots',
    oModerate: 'Moderate',
    oLittle: 'Little or none',

    // Floor plan
    oCorridor: 'Corridor — narrow and long',
    oRectangle: 'Rectangle — proportional',
    oSquare: 'Square — balanced on all sides',
    oLShaped: 'L-shaped — two connected areas',
    oIrregular: 'Irregular — angled walls',

    // Windows
    oFrontOnly: 'Front only — directional light, darker at the back',
    oFrontSide: 'Front and side — light on two axes',
    oSideOnly: 'Side only — indirect, controlled light',
    oNoWindows: 'No windows — 100% artificial lighting',

    // Storefront
    oOpen: 'Open / glass front',
    oSemiOpen: 'Semi-open',
    oClosed: 'Closed / discreet',
    oInterior: 'Interior (mall / gallery)',

    // Entrance
    oFront: 'Front of the space',
    oLeftSide: 'Left side',
    oRightSide: 'Right side',
    oBack: 'Back',

    // Fixed elements
    oColumns: 'Columns / pillars',
    oLevelChange: 'Floor level change',
    oMezzanine: 'Mezzanine',
    oStairs: 'Internal stairs',

    // Finishes
    oConcrete: 'Polished concrete',
    oCeramic: 'Ceramic / porcelain tile',
    oHardwood: 'Hardwood',
    oVinyl: 'Vinyl (LVT)',
    oStone: 'Natural stone',
    oOtherFinish: 'Other',
    oPlaster: 'Painted plaster',
    oBrick: 'Exposed brick',
    oTile: 'Ceramic tile',
    oDrywall: 'Drywall',
    oExposedConcrete: 'Exposed concrete',
    oPlasterCeil: 'Drywall / plaster',
    oWoodPanel: 'Wood panel',
    oSteelDeck: 'Steel deck',

    // Budget
    oUnder50: 'Under $50k',
    o50to150: '$50k – $150k',
    o150to300: '$150k – $300k',
    oAbove300: 'Above $300k',

    // Priority
    oFull: 'Full renovation',
    oFurniture: 'Furniture & decor',
    oLighting: 'Lighting focus',

    // Audience
    oYoung: 'Young / casual',
    oCorporate: 'Corporate',
    oFamily: 'Family',
    oTourist: 'Tourist',

    // Placeholders
    pVibeCafe: 'e.g. cozy Scandinavian, vintage industrial, Japanese minimalist…',
    pVibeBistro: 'e.g. romantic Parisian, rustic contemporary, elegant and intimate…',
    pVibeIceCream: 'e.g. bright and colorful, retro 50s diner, cool minimalist…',
    pNotes: 'Anything important about the space, brand or audience…',
    pOtelieCafe: 'e.g. keep the exposed brick, avoid too many plants, counter should be dark wood…',
    pOtelieBistro: 'e.g. I want mirrors on the walls, avoid a very dark room, tables should have white tablecloths…',
    pOtelieIceCream: 'e.g. vibrant wall colors, well-lit display case, avoid excessive kids decor…',

    // Buttons
    btnGenerate: 'Generate design concept',
    btnGenerating: 'Generating concept…',
    btnModel: 'Generate 3D model',
    btnModelLoading: 'Building 3D model in SketchUp…',
    btnModelConfirmed: 'Model confirmed ✓',
    btnYesRight: 'Yes, looks right',
    btnRegenerate: 'Regenerate',

    // 3D model
    model3dAuto: 'auto-built from your answers',
    modelMatch: 'Does this match your space?',

    // Seats / area
    unitSeats: 'seats',
    unitSqFt: 'sq ft',
    unitFt: 'ft',

    // Upload step
    sUploadStep: 'Floor plan sketch',
    uploadHint: 'Drag or click — photo, scan or digital file',
    uploadFormats: 'JPG · PNG · hand-drawn, printed or digital',
    uploadBtn: 'Analyze sketch',
    uploadAnalyzing: 'Analyzing floor plan…',
    uploadManual: 'Fill form manually',
    uploadLoaded: 'Sketch loaded',
    uploadAiNote: 'Spatial fields auto-filled — review and adjust',
    uploadChange: 'Change',
    uploadAiBadge: 'AI',
    uploadError: 'Could not read the sketch. Try a clearer image or fill manually.',
  },

  pt: {
    // Header
    tagline: 'Otelie Studio',
    title: 'Conceito de design\npara o seu espaço',
    subtitle: 'Responda algumas perguntas e receba um conceito de design completo em segundos.',
    footer: 'Otelie Studio · Com tecnologia OpenAI',

    // Sections
    sYourSpace: 'Seu espaço',
    sProfile: 'Perfil',
    sCafeProfile: 'Perfil do Café',
    sBistroProfile: 'Perfil do Bistrô',
    sSorveteriaProfile: 'Perfil da Sorveteria',
    sDimensions: 'Dimensões',
    sSpaceReading: 'Leitura do espaço',
    sFinishes: 'Acabamentos atuais',
    s3dModel: 'Modelo 3D do espaço',
    sRenovation: 'Reforma',
    sIdentity: 'Identidade',

    // Fields
    fType: 'Tipo',
    fCurrentState: 'Estado atual',
    fLocation: 'Localização',
    fServiceModel: 'Modelo de serviço',
    fMainFeature: 'Destaque principal',
    fOutdoor: 'Área externa',
    fCulinary: 'Inspiração culinária',
    fServicePeriod: 'Principal período de serviço',
    fSpecialFeature: 'Destaque especial',
    fProductType: 'Tipo de produto',
    fConsumption: 'Modelo de consumo',
    fVisualHighlight: 'Destaque visual',
    fFloorDimensions: 'Dimensões do espaço',
    fOptional: '— opcional',
    fLength: 'Comprimento',
    fWidth: 'Largura',
    fArea: 'Área aproximada',
    fAutoCalc: 'calculado automaticamente',
    fCeilingHeight: 'Pé-direito',
    fNaturalLight: 'Luz natural',
    fCapacity: 'Capacidade desejada',
    fFloorShape: 'Formato da planta',
    fWindowPos: 'Posição das janelas',
    fStorefront: 'Fachada',
    fEntrance: 'Entrada principal',
    fFixedElements: 'Elementos fixos',
    fFixedElementsNote: '— selecione todos que se aplicam',
    fCurrentFloor: 'Piso atual',
    fCurrentWalls: 'Paredes atuais',
    fCurrentCeiling: 'Teto atual',
    fKeeping: 'Vai ficar',
    fReplacing: 'Vai trocar',
    fBudget: 'Orçamento',
    fPriority: 'Prioridade',
    fDesiredStyle: 'Estilo desejado',
    fTargetAudience: 'Público-alvo',
    fNotes: 'Observações',
    fOtelieEye: 'Olhar Otelie',
    fOtelieEyeDesc: 'O que a IA deve preservar, evitar ou priorizar na imagem gerada.',

    // Space types
    oCafe: 'Café',
    oBistro: 'Bistrô',
    oIceCream: 'Sorveteria',

    // Current state
    oShell: 'Obra bruta',
    oOperating: 'Já está em funcionamento',
    oRefresh: 'Precisa de renovação',

    // Location
    oUrban: 'Térreo urbano',
    oMall: 'Shopping center',
    oNeighborhood: 'Rua de bairro',
    oOther: 'Outro',

    // Café
    oCounter: 'Balcão — serviço rápido para viagem',
    oSeating: 'Mesas — espaço para sentar e ficar',
    oHybrid: 'Híbrido — balcão na frente, mesas no fundo',
    oEspresso: 'Bar de espresso — barista e máquina como centro',
    oPastry: 'Vitrine — bolos, pães e doces em exposição',
    oBoth: 'Ambos — café especial e padaria',
    oOutdoorYes: 'Sim, área externa ou calçada',
    oOutdoorNo: 'Sem área externa',

    // Bistro
    oFrench: 'Francesa / europeia',
    oItalian: 'Italiana',
    oMediterranean: 'Mediterrânea',
    oContemporary: 'Contemporânea',
    oLunch: 'Almoço',
    oDinner: 'Jantar',
    oAllDay: 'Dia todo',
    oBrunch: 'Brunch',
    oWineBar: 'Bar de vinhos — adega e carta em destaque',
    oOpenKitchen: 'Cozinha aberta — visível aos clientes',
    oNoFeature: 'Sem destaque específico',

    // Sorveteria
    oGelato: 'Gelato artesanal',
    oSoft: 'Soft serve',
    oAcai: 'Açaí',
    oMix: 'Mix',
    oTakeaway: 'Para viagem',
    oDineIn: 'Com mesas',
    oKids: 'Kids friendly',
    oMixed: 'Misto',
    oDisplayCase: 'Vitrine refrigerada',
    oVisibleProduction: 'Produção à vista',
    oToppingBar: 'Barra de toppings',
    oNoHighlight: 'Sem destaque específico',

    // Ceiling height
    oLow: 'Abaixo de 2,40m',
    oMedium: '2,40m a 3,30m',
    oHigh: 'Acima de 3,30m',
    oLowLabel: '↳ baixo',
    oMediumLabel: '↳ médio',
    oHighLabel: '↳ alto',

    // Natural light
    oLots: 'Muita',
    oModerate: 'Moderada',
    oLittle: 'Pouca ou nenhuma',

    // Floor plan
    oCorridor: 'Corredor — estreito e comprido',
    oRectangle: 'Retangular — proporções equilibradas',
    oSquare: 'Quadrado — todos os lados iguais',
    oLShaped: 'Formato L — dois ambientes conectados',
    oIrregular: 'Irregular — paredes em ângulo',

    // Windows
    oFrontOnly: 'Só na frente — luz direcional, fundo mais escuro',
    oFrontSide: 'Frente e lateral — luz em dois eixos',
    oSideOnly: 'Só na lateral — luz indireta e controlada',
    oNoWindows: 'Sem janelas — 100% iluminação artificial',

    // Storefront
    oOpen: 'Aberta / vidro',
    oSemiOpen: 'Semi-aberta',
    oClosed: 'Fechada / discreta',
    oInterior: 'Interior (shopping / galeria)',

    // Entrance
    oFront: 'Frente do espaço',
    oLeftSide: 'Lateral esquerda',
    oRightSide: 'Lateral direita',
    oBack: 'Fundo',

    // Fixed elements
    oColumns: 'Colunas / pilares',
    oLevelChange: 'Desnível no piso',
    oMezzanine: 'Mezanino',
    oStairs: 'Escada interna',

    // Finishes
    oConcrete: 'Cimento queimado',
    oCeramic: 'Cerâmica / porcelanato',
    oHardwood: 'Madeira',
    oVinyl: 'Vinílico (LVT)',
    oStone: 'Pedra natural',
    oOtherFinish: 'Outro',
    oPlaster: 'Reboco pintado',
    oBrick: 'Tijolo aparente',
    oTile: 'Azulejo',
    oDrywall: 'Drywall',
    oExposedConcrete: 'Laje aparente',
    oPlasterCeil: 'Forro de gesso',
    oWoodPanel: 'Forro de madeira',
    oSteelDeck: 'Steel deck',

    // Budget
    oUnder50: 'Até R$150k',
    o50to150: 'R$150k – R$450k',
    o150to300: 'R$450k – R$900k',
    oAbove300: 'Acima de R$900k',

    // Priority
    oFull: 'Reforma completa',
    oFurniture: 'Móveis e decoração',
    oLighting: 'Foco em iluminação',

    // Audience
    oYoung: 'Jovem / casual',
    oCorporate: 'Corporativo',
    oFamily: 'Família',
    oTourist: 'Turista',

    // Placeholders
    pVibeCafe: 'ex: escandinavo aconchegante, industrial vintage, minimalista japonês…',
    pVibeBistro: 'ex: parisiense romântico, rústico contemporâneo, elegante e intimista…',
    pVibeIceCream: 'ex: vibrante e colorido, retrô anos 50, minimalista cool…',
    pNotes: 'Algo importante sobre o espaço, marca ou público…',
    pOtelieCafe: 'ex: manter o tijolo aparente, evitar muitas plantas, balcão em madeira escura…',
    pOtelieBistro: 'ex: quero espelhos nas paredes, evitar ambiente muito escuro, mesas com toalha branca…',
    pOtelieIceCream: 'ex: cores vibrantes nas paredes, vitrine bem iluminada, evitar excesso de decoração kids…',

    // Buttons
    btnGenerate: 'Gerar conceito de design',
    btnGenerating: 'Gerando conceito…',
    btnModel: 'Gerar modelo 3D',
    btnModelLoading: 'Construindo modelo no SketchUp…',
    btnModelConfirmed: 'Modelo confirmado ✓',
    btnYesRight: 'Sim, ficou certo',
    btnRegenerate: 'Gerar novamente',

    // 3D model
    model3dAuto: 'construído automaticamente com suas respostas',
    modelMatch: 'Esse modelo representa bem o seu espaço?',

    // Seats / area
    unitSeats: 'lugares',
    unitSqFt: 'm²',
    unitFt: 'm',

    // Upload step
    sUploadStep: 'Croqui de planta',
    uploadHint: 'Arraste ou clique — foto, scan ou arquivo digital',
    uploadFormats: 'JPG · PNG · desenhado, impresso ou digital',
    uploadBtn: 'Analisar croqui',
    uploadAnalyzing: 'Analisando planta…',
    uploadManual: 'Preencher manualmente',
    uploadLoaded: 'Croqui carregado',
    uploadAiNote: 'Campos espaciais preenchidos — revise e ajuste',
    uploadChange: 'Trocar',
    uploadAiBadge: 'IA',
    uploadError: 'Não foi possível ler o croqui. Tente uma imagem mais nítida ou preencha manualmente.',
  },
} as const

export type TKeys = keyof typeof t.en

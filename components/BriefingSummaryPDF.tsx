import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const s = StyleSheet.create({
  page:    { padding: 48, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  logo:    { fontSize: 9, fontFamily: 'Helvetica-Bold', letterSpacing: 3, color: '#6366f1' },
  title:   { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#1f2937', marginTop: 6 },
  ref:     { fontSize: 9, color: '#9ca3af', marginTop: 3, fontFamily: 'Courier' },
  divider: { borderBottom: '1pt solid #e5e7eb', marginVertical: 18 },
  h2:      { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6366f1', letterSpacing: 1.5, marginBottom: 8 },
  row:     { flexDirection: 'row', marginBottom: 5 },
  label:   { fontSize: 9, color: '#9ca3af', width: 130 },
  value:   { fontSize: 9, color: '#1f2937', flex: 1 },
  tag:     { backgroundColor: '#eef2ff', color: '#6366f1', fontSize: 8, padding: '3 7', borderRadius: 6, marginRight: 5 },
  tagRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  footer:  { position: 'absolute', bottom: 32, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between' },
  ftext:   { fontSize: 8, color: '#d1d5db' },
  section: { marginBottom: 20 },
  photoGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  photoWrap:  { width: '30%' },
  photoImg:   { width: '100%', height: 90, objectFit: 'cover', borderRadius: 4 },
  photoLabel: { fontSize: 7, color: '#9ca3af', marginTop: 3 },
})

function Row({ label, value }: { label: string; value: string }) {
  if (!value || value === '—') return null
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value}</Text>
    </View>
  )
}

export interface BriefingSummaryData {
  projetoId: string
  createdAt: string
  lang: 'pt' | 'en'
  // space
  area: number
  comprimento?: number
  largura?: number
  alturaPeDireito?: number
  pisoTipo: string
  paredeTipo: string
  tetoTipo: string
  fotosEnviadas: string[]
  fotosBase64: Record<string, string>  // catId → data URL
  // needs
  tipoUso: string
  nomeMarca: string
  redeSocial: string
  primeiraUnidade: string
  perfilPublico: string[]
  capacidade: string
  palavrasChave: string[]
  orcamento: string
  prazo: string
  restricoes: string
}

const orcMap: Record<string, Record<string, string>> = {
  pt: { 'ate50k': 'Até R$ 50k', '50k-150k': 'R$ 50k – 150k', '150k-300k': 'R$ 150k – 300k', 'acima300k': 'Acima de R$ 300k' },
  en: { 'ate50k': 'Up to R$ 50k', '50k-150k': 'R$ 50k – 150k', '150k-300k': 'R$ 150k – 300k', 'acima300k': 'Above R$ 300k' },
}
const prazoMap: Record<string, Record<string, string>> = {
  pt: { 'urgente': 'Urgente (< 1 mês)', '1-3-meses': '1 a 3 meses', '3-6-meses': '3 a 6 meses', 'sem-prazo': 'Sem prazo' },
  en: { 'urgente': 'Urgent (< 1 month)', '1-3-meses': '1–3 months', '3-6-meses': '3–6 months', 'sem-prazo': 'No deadline' },
}
const tipoMap: Record<string, Record<string, string>> = {
  pt: { cafeteria: 'Cafeteria', restaurante: 'Pequeno restaurante', sorveteria: 'Sorveteria', bar: 'Bar' },
  en: { cafeteria: 'Café / Coffee Shop', restaurante: 'Small Restaurant', sorveteria: 'Ice Cream Shop', bar: 'Bar' },
}
const fotoLabels: Record<string, Record<string, string>> = {
  pt: { fachada: 'Fachada / Entrada', int_fundo: 'Interior → fundo', int_frente: 'Interior → entrada', lat_esq: 'Lateral esquerda', lat_dir: 'Lateral direita', detalhes: 'Detalhes' },
  en: { fachada: 'Facade / Entrance', int_fundo: 'Interior → back', int_frente: 'Interior → entrance', lat_esq: 'Left side', lat_dir: 'Right side', detalhes: 'Details' },
}

export function BriefingSummaryPDF({ d }: { d: BriefingSummaryData }) {
  const l = d.lang
  const isPt = l === 'pt'

  const labels = {
    space:    isPt ? 'LEVANTAMENTO DO ESPAÇO' : 'SPACE SURVEY',
    needs:    isPt ? 'NECESSIDADES' : 'NEEDS',
    area:     isPt ? 'Área' : 'Area',
    dims:     isPt ? 'Dimensões' : 'Dimensions',
    ceiling:  isPt ? 'Pé-direito' : 'Ceiling height',
    floor:    isPt ? 'Piso' : 'Floor',
    walls:    isPt ? 'Paredes' : 'Walls',
    ceiling2: isPt ? 'Teto' : 'Ceiling',
    photos:   isPt ? 'Fotos enviadas' : 'Photos submitted',
    type:     isPt ? 'Tipo de uso' : 'Type of use',
    brand:    isPt ? 'Marca' : 'Brand',
    social:   isPt ? 'Rede social' : 'Social media',
    first:    isPt ? 'Primeira unidade' : 'First location',
    audience: isPt ? 'Público' : 'Audience',
    capacity: isPt ? 'Capacidade' : 'Capacity',
    concept:  isPt ? 'Conceito' : 'Concept',
    budget:   isPt ? 'Orçamento' : 'Budget',
    timeline: isPt ? 'Prazo' : 'Timeline',
    restrict: isPt ? 'Restrições' : 'Restrictions',
  }

  const dims = d.comprimento && d.largura ? `${d.largura} × ${d.comprimento} m` : '—'
  const ceiling = d.alturaPeDireito ? `${d.alturaPeDireito} m` : '—'
  const tipo = tipoMap[l]?.[d.tipoUso] ?? d.tipoUso
  const orc  = orcMap[l]?.[d.orcamento]  ?? d.orcamento
  const prz  = prazoMap[l]?.[d.prazo]    ?? d.prazo
  const prim = d.primeiraUnidade === 'sim' ? (isPt ? 'Sim' : 'Yes') : d.primeiraUnidade === 'nao' ? (isPt ? 'Não, já operamos' : 'No, already operating') : '—'

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* Header */}
        <Text style={s.logo}>OTELIE</Text>
        <Text style={s.title}>{isPt ? 'Resumo do Briefing' : 'Briefing Summary'}</Text>
        <Text style={s.ref}>{d.projetoId} · {d.createdAt}</Text>

        <View style={s.divider} />

        {/* Space */}
        <View style={s.section}>
          <Text style={s.h2}>{labels.space}</Text>
          <Row label={labels.area}     value={d.area ? `${d.area} m²` : '—'} />
          <Row label={labels.dims}     value={dims} />
          <Row label={labels.ceiling}  value={ceiling} />
          <Row label={labels.floor}    value={d.pisoTipo} />
          <Row label={labels.walls}    value={d.paredeTipo} />
          <Row label={labels.ceiling2} value={d.tetoTipo} />
          <Row label={labels.photos}   value={d.fotosEnviadas.map(id => fotoLabels[l]?.[id] ?? id).join(', ')} />
        </View>

        <View style={s.divider} />

        {/* Needs */}
        <View style={s.section}>
          <Text style={s.h2}>{labels.needs}</Text>
          <Row label={labels.type}     value={tipo} />
          <Row label={labels.brand}    value={d.nomeMarca} />
          <Row label={labels.social}   value={d.redeSocial} />
          <Row label={labels.first}    value={prim} />
          <Row label={labels.audience} value={d.perfilPublico.join(', ')} />
          <Row label={labels.capacity} value={d.capacidade} />
          {d.palavrasChave.length > 0 && (
            <View style={s.row}>
              <Text style={s.label}>{labels.concept}</Text>
              <View style={[s.tagRow, { flex: 1 }]}>
                {d.palavrasChave.map((k, i) => <Text key={i} style={s.tag}>{k}</Text>)}
              </View>
            </View>
          )}
          <Row label={labels.budget}   value={orc} />
          <Row label={labels.timeline} value={prz} />
          <Row label={labels.restrict} value={d.restricoes} />
        </View>

        <View style={s.footer}>
          <Text style={s.ftext}>OTELIE · Concept Redesign™</Text>
          <Text style={s.ftext}>{d.projetoId}</Text>
        </View>

      </Page>

      {/* Page 2 — Photos */}
      {Object.keys(d.fotosBase64).length > 0 && (
        <Page size="A4" style={s.page}>
          <Text style={s.logo}>OTELIE</Text>
          <Text style={[s.h2, { marginTop: 8, marginBottom: 16 }]}>{isPt ? 'FOTOS DO ESPAÇO' : 'SPACE PHOTOS'}</Text>

          <View style={s.photoGrid}>
            {Object.entries(d.fotosBase64).map(([catId, dataUrl]) => (
              <View key={catId} style={s.photoWrap}>
                <Image src={dataUrl} style={s.photoImg} />
                <Text style={s.photoLabel}>{fotoLabels[l]?.[catId] ?? catId}</Text>
              </View>
            ))}
          </View>

          <View style={s.footer}>
            <Text style={s.ftext}>OTELIE · Concept Redesign™</Text>
            <Text style={s.ftext}>{d.projetoId}</Text>
          </View>
        </Page>
      )}

    </Document>
  )
}

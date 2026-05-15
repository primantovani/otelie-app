import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { BriefResult } from '@/lib/types'

const s = StyleSheet.create({
  page: { padding: 48, fontFamily: 'Helvetica', backgroundColor: '#fafafa' },
  header: { marginBottom: 32 },
  logo: { fontSize: 11, fontFamily: 'Helvetica-Bold', letterSpacing: 2, color: '#6366f1' },
  title: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#1f2937', marginTop: 8 },
  subtitle: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  divider: { borderBottom: '1pt solid #e5e7eb', marginVertical: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#6366f1', letterSpacing: 1, marginBottom: 6 },
  sectionText: { fontSize: 12, color: '#4b5563', lineHeight: 1.7 },
  paletteRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  swatch: { width: 24, height: 24, borderRadius: 12 },
  vibeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  vibeTag: { backgroundColor: '#f0f0ff', color: '#6366f1', fontSize: 9, padding: '3 8', borderRadius: 8 },
  footer: { position: 'absolute', bottom: 32, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 9, color: '#9ca3af' },
})

interface Props {
  result: BriefResult
  spaceLabel: string
  area: number
}

export function BriefPDF({ result, spaceLabel, area }: Props) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.logo}>OTELIE STUDIO</Text>
          <Text style={s.title}>Conceito de Design</Text>
          <Text style={s.subtitle}>{spaceLabel} · {area}m²</Text>
        </View>

        <View style={s.divider} />

        <View style={s.section}>
          <Text style={s.sectionTitle}>ATMOSFERA</Text>
          <View style={s.vibeRow}>
            {result.vibe.map((v) => (
              <Text key={v} style={s.vibeTag}>{v}</Text>
            ))}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>PALETA DE CORES</Text>
          <View style={s.paletteRow}>
            {result.palette.map((color) => (
              <View key={color} style={[s.swatch, { backgroundColor: color }]} />
            ))}
          </View>
          <Text style={[s.sectionText, { marginTop: 6, fontSize: 10, color: '#9ca3af' }]}>
            {result.palette.join(' · ')}
          </Text>
        </View>

        <View style={s.divider} />

        <View style={s.section}>
          <Text style={s.sectionTitle}>💡 ILUMINAÇÃO</Text>
          <Text style={s.sectionText}>{result.lighting}</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>🪵 MATERIAIS</Text>
          <Text style={s.sectionText}>{result.materials}</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>🔇 ACÚSTICA</Text>
          <Text style={s.sectionText}>{result.acoustics}</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>📐 LAYOUT</Text>
          <Text style={s.sectionText}>{result.layout}</Text>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>otelie.vercel.app</Text>
          <Text style={s.footerText}>Gerado com OTELIE Studio</Text>
        </View>
      </Page>
    </Document>
  )
}

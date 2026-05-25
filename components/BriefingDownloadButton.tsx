'use client'

import { PDFDownloadLink } from '@react-pdf/renderer'
import { BriefingSummaryPDF, type BriefingSummaryData } from './BriefingSummaryPDF'

interface Props {
  data: BriefingSummaryData
  label: string
  loadingLabel: string
}

export default function BriefingDownloadButton({ data, label, loadingLabel }: Props) {
  return (
    <PDFDownloadLink
      document={<BriefingSummaryPDF d={data} />}
      fileName={`${data.projetoId}-briefing.pdf`}
    >
      {({ loading }) => (
        <button className="w-full py-3 border border-[#e5e7eb] rounded-xl text-sm text-[#6b7280] font-medium hover:bg-[#f8f9fb] transition-colors flex items-center justify-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {loading ? loadingLabel : label}
        </button>
      )}
    </PDFDownloadLink>
  )
}

import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType
} from 'docx';
import { saveAs } from 'file-saver';
import { FACTORY } from '../lib/factory';
import { todayStr } from '../utils/format';
import type { Lang } from '../types';
import type { ExportSpec } from './exportPdf';

/** Word (.docx) export — Word shapes Urdu natively; runs are marked RTL for Urdu. */
export async function exportWord(spec: ExportSpec, filename: string): Promise<void> {
  const ur = spec.lang === 'ur';

  const para = (
    text: string,
    opts: { bold?: boolean; size?: number; center?: boolean; urdu?: boolean; color?: string; spacingBefore?: number } = {}
  ) =>
    new Paragraph({
      bidirectional: ur,
      alignment: opts.center ? AlignmentType.CENTER : undefined,
      spacing: { before: opts.spacingBefore ?? 40 },
      children: [
        new TextRun({
          text,
          bold: opts.bold,
          size: opts.size ?? 22,
          color: opts.color ?? '1F2937',
          rightToLeft: ur && opts.urdu !== false
        })
      ]
    });

  const borders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
    insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' }
  };

  const cell = (text: string | number, opts: { head?: boolean; align?: 'left' | 'right' | 'center' } = {}): TableCell =>
    new TableCell({
      children: [
        new Paragraph({
          bidirectional: ur,
          alignment: opts.align === 'right' ? AlignmentType.RIGHT : opts.align === 'center' ? AlignmentType.CENTER : undefined,
          children: [
            new TextRun({
              text: String(text ?? ''),
              bold: opts.head,
              size: 20,
              color: opts.head ? 'FFFFFF' : '111827',
              rightToLeft: ur
            })
          ]
        })
      ],
      shading: opts.head ? { type: ShadingType.CLEAR, fill: '5B54E8', color: 'auto' } : undefined
    });

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders,
    visuallyRightToLeft: ur,
    rows: [
      new TableRow({
        tableHeader: true,
        children: spec.columns.map((c) => cell(c.label, { head: true, align: c.align }))
      }),
      ...spec.rows.map(
        (r) =>
          new TableRow({
            children: r.map((v, i) => cell(v, { align: spec.columns[i]?.align }))
          })
      )
    ]
  });

  const children = [
    para(FACTORY.nameUr, { bold: true, size: 40, center: true, spacingBefore: 0 }),
    para(FACTORY.nameEn, { bold: true, size: 22, center: true, color: '6D28D9' }),
    para(`${FACTORY.line1Ur} — ${FACTORY.line2Ur}`, { center: true, size: 20 }),
    para(ur ? FACTORY.addressUr : FACTORY.addressEn, { center: true, size: 18 }),
    para(ur ? FACTORY.proprietorsUr : FACTORY.proprietorsEn, { center: true, size: 18 }),
    para(`${FACTORY.phone1Ur} | ${FACTORY.phone2Ur}`, { center: true, size: 18 }),
    para(`${spec.title}  —  ${todayStr()}`, { bold: true, size: 28, center: true, spacingBefore: 240 }),
    table
  ];

  if (spec.summary?.length) {
    for (const s of spec.summary) {
      children.push(para(`${s.label}:  ${s.value}`, { bold: true, size: 22, spacingBefore: 120 }));
    }
  }
  children.push(para(' ', { spacingBefore: 600 }));
  children.push(para(ur ? 'دستخط: ____________________' : 'Signature: ____________________', { bold: true, size: 20 }));

  const doc = new Document({
    sections: [{ properties: {}, children }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename.endsWith('.docx') ? filename : `${filename}.docx`);
}

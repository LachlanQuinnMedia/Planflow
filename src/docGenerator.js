import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType } from 'docx'
import { saveAs } from 'file-saver'

const formatDate = (date) => {
  if (!date) return 'Not set'
  return new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
}

const heading = (text) => new Paragraph({
  text,
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 400, after: 200 },
})

const subheading = (text) => new Paragraph({
  text,
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 300, after: 150 },
})

const para = (text) => new Paragraph({
  children: [new TextRun({ text, size: 24 })],
  spacing: { after: 200 },
})

const boldPara = (label, value) => new Paragraph({
  children: [
    new TextRun({ text: `${label}: `, bold: true, size: 24 }),
    new TextRun({ text: value || 'Not specified', size: 24 }),
  ],
  spacing: { after: 150 },
})

export const generatePlanningReport = async (job) => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'PLANNING REPORT', bold: true, size: 48 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: job.name || 'Planning Application', bold: true, size: 32 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: job.address || '', size: 24, color: '666666' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),

        heading('1. Application Details'),
        boldPara('Application type', job.app_type),
        boldPara('Assessment level', job.assessment_level),
        boldPara('Proposed use', job.proposed_use),
        boldPara('Site address', job.address),
        boldPara('Lot / RP reference', job.lot_reference),
        boldPara('Local government area', job.council),
        boldPara('Planning zone', job.zone),
        boldPara('Referral agencies', job.referral_agencies),

        heading('2. Client Details'),
        boldPara('Applicant', `${job.client_first_name || ''} ${job.client_last_name || ''}`),
        boldPara('Email', job.client_email),
        boldPara('Phone', job.client_phone),

        heading('3. Site Description'),
        para('The subject site is located at ' + (job.address || '[address]') + ', within the ' + (job.council || '[council]') + ' local government area. The site is situated within the ' + (job.zone || '[zone]') + '.'),
        para('Insert detailed site description here including lot size, existing improvements, surrounding land uses, access and services.'),

        heading('4. Proposal'),
        para('The applicant proposes to ' + (job.proposed_use || '[describe proposed use]') + '. The proposal is assessed as ' + (job.assessment_level || '[assessment level]') + ' development under the relevant planning scheme.'),
        para('Insert detailed description of the proposal here.'),

        heading('5. Planning Assessment'),
        subheading('5.1 Relevant Assessment Benchmarks'),
        para('The application has been assessed against the relevant assessment benchmarks contained within the ' + (job.council || '[council]') + ' Planning Scheme.'),
        para('Insert assessment benchmarks and codes here.'),

        subheading('5.2 Zone Assessment'),
        para('The subject site is located within the ' + (job.zone || '[zone]') + '. The proposed use is consistent with the intent of the zone for the following reasons:'),
        para('Insert zone assessment here.'),

        subheading('5.3 Overlay Assessment'),
        para('Insert overlay assessment here, including any relevant overlays that apply to the subject site.'),

        heading('6. Referral Agencies'),
        para(job.referral_agencies
          ? `The following referral agencies have been identified: ${job.referral_agencies}.`
          : 'No referral agencies have been identified for this application.'),

        heading('7. Conclusion'),
        para(`Having assessed the proposed ${job.proposed_use || 'development'} against the relevant provisions of the ${job.council || '[council]'} Planning Scheme, it is considered that the proposal is appropriate for the site and surrounding area.`),
        para('The proposal complies with, or is consistent with, the relevant assessment benchmarks and should be approved accordingly.'),

        new Paragraph({
          children: [new TextRun({ text: `Prepared by: ${job.planner || '[Planner name]'}`, size: 24 })],
          spacing: { before: 400, after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `Date: ${formatDate(new Date())}`, size: 24 })],
          spacing: { after: 100 },
        }),
      ],
    }],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `Planning_Report_${job.code || 'draft'}.docx`)
}

export const generateIRResponse = async (job, irNumber = 1) => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'INFORMATION REQUEST RESPONSE', bold: true, size: 48 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `IR #${irNumber} — ${job.name || 'Planning Application'}`, bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),

        heading('Application Details'),
        boldPara('Application reference', job.code),
        boldPara('Site address', job.address),
        boldPara('Applicant', `${job.client_first_name || ''} ${job.client_last_name || ''}`),
        boldPara('Application type', job.app_type),
        boldPara('Council', job.council),
        boldPara('Prepared by', job.planner),
        boldPara('Date', formatDate(new Date())),

        heading('Response to Information Request'),
        para('This response is prepared on behalf of ' + (job.client_first_name || '') + ' ' + (job.client_last_name || '') + ' in response to the Information Request issued by ' + (job.council || '[council]') + ' in relation to the above application.'),

        subheading('IR Item 1'),
        para('Insert council information request item here.'),
        para('Response: Insert response to IR item 1 here.'),

        subheading('IR Item 2'),
        para('Insert council information request item here.'),
        para('Response: Insert response to IR item 2 here.'),

        subheading('IR Item 3'),
        para('Insert council information request item here.'),
        para('Response: Insert response to IR item 3 here.'),

        heading('Conclusion'),
        para('It is considered that this response adequately addresses all matters raised in the Information Request. Should you require any further information, please contact our office.'),

        new Paragraph({
          children: [new TextRun({ text: `${job.planner || '[Planner name]'}`, size: 24 })],
          spacing: { before: 400, after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: formatDate(new Date()), size: 24 })],
        }),
      ],
    }],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `IR_Response_${job.code || 'draft'}_IR${irNumber}.docx`)
}

export const generateEngagementLetter = async (job) => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [new TextRun({ text: formatDate(new Date()), size: 24 })],
          spacing: { after: 400 },
        }),

        new Paragraph({
          children: [new TextRun({ text: `${job.client_first_name || ''} ${job.client_last_name || ''}`, size: 24, bold: true })],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: job.address || '', size: 24 })],
          spacing: { after: 400 },
        }),

        new Paragraph({
          children: [new TextRun({ text: `Dear ${job.client_first_name || 'Client'},`, size: 24 })],
          spacing: { after: 300 },
        }),

        new Paragraph({
          children: [new TextRun({ text: `Re: ${job.app_type || 'Planning Application'} — ${job.address || '[address]'}`, bold: true, size: 24 })],
          spacing: { after: 300 },
        }),

        para('Thank you for engaging our services in relation to the above matter. We are pleased to confirm our instructions to act on your behalf in relation to the proposed ' + (job.proposed_use || '[proposed use]') + ' at ' + (job.address || '[address]') + '.'),

        heading('Scope of Services'),
        para('Our services will include:'),
        new Paragraph({ text: '• Preparation and lodgement of the development application', spacing: { after: 100 } }),
        new Paragraph({ text: '• Liaison with ' + (job.council || '[council]') + ' throughout the assessment process', spacing: { after: 100 } }),
        new Paragraph({ text: '• Preparation of planning report and supporting documentation', spacing: { after: 100 } }),
        new Paragraph({ text: '• Response to any information requests issued by council', spacing: { after: 200 } }),

        heading('Fee Estimate'),
        boldPara('Estimated hours', `${job.budget_hours || '[hours]'} hours`),
        boldPara('Hourly rate', `$${job.planner_rate || '[rate]'} per hour (excluding GST)`),
        boldPara('Estimated fee', `$${job.budget_hours && job.planner_rate ? (job.budget_hours * job.planner_rate).toLocaleString() : '[amount]'} (excluding GST)`),
        para('Please note this is an estimate only. Additional fees may apply if the scope of works changes or if additional work is required beyond what is outlined above.'),

        heading('Next Steps'),
        para('To proceed, please sign and return a copy of this letter confirming your instructions. We will then commence preparation of the application.'),

        para('Please do not hesitate to contact our office should you have any questions.'),

        new Paragraph({
          children: [new TextRun({ text: 'Yours sincerely,', size: 24 })],
          spacing: { before: 400, after: 300 },
        }),
        new Paragraph({
          children: [new TextRun({ text: job.planner || '[Planner name]', bold: true, size: 24 })],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Town Planner', size: 24 })],
        }),
      ],
    }],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `Engagement_Letter_${job.code || 'draft'}.docx`)
}

export const generateInvoice = async (job) => {
  const subtotal = (job.budget_hours || 0) * (job.planner_rate || 0)
  const gst = subtotal * 0.1
  const total = subtotal + gst

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'TAX INVOICE', bold: true, size: 48 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),

        boldPara('Invoice number', `INV-${job.code || 'DRAFT'}-01`),
        boldPara('Date', formatDate(new Date())),
        boldPara('Due date', formatDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000))),

        heading('Bill to'),
        new Paragraph({
          children: [new TextRun({ text: `${job.client_first_name || ''} ${job.client_last_name || ''}`, size: 24 })],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: job.address || '', size: 24 })],
          spacing: { after: 400 },
        }),

        heading('Services'),
        boldPara('Description', `${job.app_type || 'Planning'} services — ${job.name || ''}`),
        boldPara('Hours', `${job.budget_hours || 0} hours @ $${job.planner_rate || 0}/hr`),

        new Paragraph({ spacing: { after: 200 } }),
        boldPara('Subtotal', `$${subtotal.toLocaleString()}`),
        boldPara('GST (10%)', `$${gst.toLocaleString()}`),
        new Paragraph({
          children: [
            new TextRun({ text: 'TOTAL: ', bold: true, size: 28 }),
            new TextRun({ text: `$${total.toLocaleString()}`, bold: true, size: 28 }),
          ],
          spacing: { before: 200, after: 400 },
        }),

        heading('Payment details'),
        para('Please make payment by direct deposit to:'),
        boldPara('Bank', 'Insert bank name'),
        boldPara('BSB', 'Insert BSB'),
        boldPara('Account', 'Insert account number'),
        boldPara('Reference', `INV-${job.code || 'DRAFT'}-01`),

        para('Payment is due within 14 days. Thank you for your business.'),
      ],
    }],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `Invoice_${job.code || 'draft'}.docx`)
}
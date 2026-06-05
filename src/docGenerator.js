import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { saveAs } from 'file-saver'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } from 'docx'

const formatDate = (date) => {
  if (!date) return 'Not set'
  return new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
}

const generateFromTemplate = async (templateFilename, data, outputFilename) => {
  const response = await fetch(`/templates/${templateFilename}`)
  if (!response.ok) throw new Error(`Could not load template: ${templateFilename}`)
  const arrayBuffer = await response.arrayBuffer()
  const zip = new PizZip(arrayBuffer)
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })
  doc.render(data)
  const blob = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
  saveAs(blob, outputFilename)
}

export const generateLodgementCoverLetter = async (job) => {
  await generateFromTemplate(
    'Lodgement_Cover_Letter.docx',
    {
      hpc_ref:         job.code || '',
      date:            formatDate(new Date()),
      council:         job.council || '',
      council_address: job.council_address || '',
      council_suburb:  job.council_suburb || '',
      council_email:   job.council_email || '',
      proposed_use:    job.proposed_use || '',
      address:         job.address || '',
      lot_reference:   job.lot_reference || '',
      planner_name:    job.planner || '',
      planner_email:   job.planner_email || '',
    },
    `Lodgement_Cover_Letter_${job.code || 'draft'}.docx`
  )
}

export const generateNoticeToRevive = async (job) => {
  await generateFromTemplate(
    'Notice_to_Revive.docx',
    {
      hpc_ref:          job.code || '',
      council_ref:      job.council_ref || '',
      sara_ref:         job.sara_ref || '',
      date:             formatDate(new Date()),
      council:          job.council || '',
      attn:             job.attn || '',
      council_address:  job.council_address || '',
      council_email:    job.council_email || '',
      app_number:       job.app_number || '',
      address:          job.address || '',
      lot_reference:    job.lot_reference || '',
      planner_name:     job.planner || '',
      planner_position: job.position || 'Urban Planner',
      planner_email:    job.planner_email || '',
    },
    `Notice_to_Revive_${job.code || 'draft'}.docx`
  )
}

export const generateNoticeToStop = async (job) => {
  await generateFromTemplate(
    'Notice_to_Stop.docx',
    {
      hpc_ref:         job.code || '',
      council_ref:     job.council_ref || '',
      date:            formatDate(new Date()),
      council:         job.council || '',
      council_address: job.council_address || '',
      council_email:   job.council_email || '',
      attn:            job.attn || '',
      app_number:      job.app_number || '',
      address:         job.address || '',
      planner_name:    job.planner || '',
      planner_email:   job.planner_email || '',
    },
    `Notice_to_Stop_${job.code || 'draft'}.docx`
  )
}

export const generateQuoteRequest = async (job) => {
  await generateFromTemplate(
    'Quote_Request.docx',
    {
      hpc_ref:            job.code || '',
      date:               formatDate(new Date()),
      consultant_company: job.consultant_company || '',
      consultant_attn:    job.consultant_attn || '',
      consultant_email:   job.consultant_email || '',
      consultant_address: job.consultant_address || '',
      address:            job.address || '',
      lot_reference:      job.lot_reference || '',
      proposed_use:       job.proposed_use || '',
      scope_of_works:     job.scope_of_works || '',
      planner_name:       job.planner || '',
      planner_email:      job.planner_email || '',
    },
    `Quote_Request_${job.code || 'draft'}.docx`
  )
}

export const generateWithdrawApplication = async (job) => {
  await generateFromTemplate(
    'Withdraw_Application.docx',
    {
      hpc_ref:            job.code || '',
      app_number:         job.app_number || '',
      date:               formatDate(new Date()),
      council:            job.council || '',
      council_department: job.council_department || '',
      council_address:    job.council_address || '',
      proposed_use:       job.proposed_use || '',
      address:            job.address || '',
      lot_reference:      job.lot_reference || '',
      planner_name:       job.planner || '',
      planner_email:      job.planner_email || '',
    },
    `Withdraw_Application_${job.code || 'draft'}.docx`
  )
}

const heading = (text) => new Paragraph({
  text, heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 },
})
const subheading = (text) => new Paragraph({
  text, heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 },
})
const para = (text) => new Paragraph({
  children: [new TextRun({ text, size: 24 })], spacing: { after: 200 },
})
const boldPara = (label, value) => new Paragraph({
  children: [
    new TextRun({ text: `${label}: `, bold: true, size: 24 }),
    new TextRun({ text: value || 'Not specified', size: 24 }),
  ], spacing: { after: 150 },
})

const bullet = (text) => new Paragraph({
  children: [new TextRun({ text: `\u2022  ${text}`, size: 22 })],
  spacing: { before: 60, after: 60 },
  indent: { left: 360 },
})

const stageHeading = (label, fee) => new Paragraph({
  children: [
    new TextRun({ text: label, bold: true, size: 24 }),
    new TextRun({ text: `    $${fee.toLocaleString()} + GST`, bold: true, size: 24, color: '16a34a' }),
  ],
  spacing: { before: 300, after: 120 },
})

const feeRow = (label, payableTo, amount) => new TableRow({
  children: [
    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: label, size: 22 })] })], width: { size: 40, type: WidthType.PERCENTAGE } }),
    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: payableTo, size: 22 })] })], width: { size: 30, type: WidthType.PERCENTAGE } }),
    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: amount ? `$${amount.toLocaleString()}` : '', size: 22 })] })], width: { size: 30, type: WidthType.PERCENTAGE } }),
  ],
})

const feeTableHeader = (stageLabel) => new TableRow({
  children: [
    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: stageLabel, bold: true, size: 22 })] })], width: { size: 40, type: WidthType.PERCENTAGE } }),
    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Payable to:', size: 22 })] })], width: { size: 30, type: WidthType.PERCENTAGE } }),
    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '$ (+ GST)', size: 22 })] })], width: { size: 30, type: WidthType.PERCENTAGE } }),
  ],
})

export const generateFeeProposal = async (job) => {
  const stage1Fee = parseFloat(job.hpc_stages?.stage1?.fee || 500)
  const stage2Fee = parseFloat(job.hpc_stages?.stage2?.fee || 3000)
  const stage3Fee = parseFloat(job.hpc_stages?.stage3?.fee || 2000)
  const subtotal = stage1Fee + stage2Fee + stage3Fee
  const gst = subtotal * 0.1
  const total = subtotal + gst

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Header
        new Paragraph({
          children: [new TextRun({ text: 'CODE ASSESSABLE DEVELOPMENT APPLICATION', bold: true, size: 36 })],
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Fee Proposal', size: 28, color: '374151' })],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: formatDate(new Date()), size: 22, color: '6b7280' })],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `${job.client_first_name || ''} ${job.client_last_name || ''}`.trim(), size: 22 })],
          spacing: { after: 60 },
        }),
        new Paragraph({
          children: [new TextRun({ text: `Re: ${job.proposed_use || job.app_type || 'Development Application'} — ${job.address || ''}`, size: 22 })],
          spacing: { after: 400 },
        }),

        // Stage 1
        stageHeading('Stage 1 – Preliminary Planning Investigations', stage1Fee),
        bullet('Attend one (1) pre-start meeting with client and any other relevant consultants'),
        bullet('Desktop analysis of site and surrounding uses'),
        bullet('Assess proposed development against local and state government legislation'),
        bullet('Identify zone, overlays and local plan requirements'),
        bullet('Advise on the site\'s development potential and constraints'),
        bullet('Identify and review relevant adjoining / nearby development approvals'),
        bullet('Advise client of necessary external consultants for supporting information to accompany development application'),
        bullet('Determine application type/s and council lodgement fees'),
        bullet('Provide advice to client on development potential and progressing with a development application'),
        new Paragraph({ spacing: { after: 200 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            feeTableHeader('Stage 1'),
            feeRow('Preliminary Planning Investigations', 'HPC Planning', stage1Fee),
            feeRow('Sub-total', '', stage1Fee),
          ],
        }),
        new Paragraph({ spacing: { after: 400 } }),

        // Stage 2
        stageHeading('Stage 2 – Prepare and Lodge a Code Assessable Development Application', stage2Fee),
        bullet('Prepare design brief for the architect/draftsman - including details on built form (setbacks and site cover) / landscaping / vehicle access for the proposed development'),
        bullet('Obtain quote/s, engage and co-ordinate external consultants for supporting information to accompany development application (if required)'),
        bullet('Review draft architectural plans and provide advice on any changes required to architect/draftsman'),
        bullet('Review external consultant\'s reports and coordinate information'),
        bullet('Prepare land owner\'s consent form for signing'),
        bullet('Prepare Town Planning Report and Code Compliance Statements, including assessment of the proposal / final plans against Planning Scheme Strategic Framework and local legislation/development codes'),
        bullet('Complete statutory application forms'),
        bullet(`Collate and lodge application with ${job.council || 'Council'} in compliance with the requirements of the Planning Act 2016 and Development Assessment Rules`),
        bullet('Ensure application has been \'properly made\' in accordance with the Planning Act 2016 and Development Assessment Rules'),
        new Paragraph({ spacing: { after: 200 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            feeTableHeader('Stage 2'),
            feeRow('Code Development Application', 'HPC Planning', stage2Fee),
            feeRow('Sub-total', '', stage2Fee),
          ],
        }),
        new Paragraph({ spacing: { after: 400 } }),

        // Stage 3
        stageHeading('Stage 3 – Manage and Coordinate Post Lodgement Services up to the Decision Notice', stage3Fee),
        bullet('Project manage the development application with regards to the confirmation notice and information requests'),
        bullet('Obtain quotes, engage and co-ordinate external consultants for amended or additional supporting information to respond to information requests'),
        bullet('Review and provide written responses to Council information request'),
        bullet('Review and provide written responses to Council\'s further advice notice(s)'),
        bullet('Ensure application is managed in accordance with the requirements of the Planning Act 2016 and Development Assessment Rules'),
        bullet('Attend one (1) meeting with consultants (if required) in relation to issues associated with the application, and attend one (1) meeting with council (if required)'),
        bullet('Respond to Assessment Manager queries'),
        bullet('Review and negotiate draft conditions'),
        bullet('Provide client with digital copy of the Decision Notice'),
        bullet('Advise client on approval conditions and/or appeal rights'),
        new Paragraph({ spacing: { after: 200 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            feeTableHeader('Stage 3'),
            feeRow('Project Manage Application', 'HPC Planning', stage3Fee),
            feeRow('Sub-total', '', stage3Fee),
          ],
        }),
        new Paragraph({ spacing: { after: 400 } }),

        // Total
        new Paragraph({
          children: [
            new TextRun({ text: `Total across all three stages: $${subtotal.toLocaleString()} + GST`, bold: true, size: 26 }),
          ],
          spacing: { before: 200, after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `GST: $${gst.toLocaleString()}`, size: 24 }),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Total (inc GST): $${total.toLocaleString()}`, bold: true, size: 26, color: '16a34a' }),
          ],
          spacing: { after: 400 },
        }),

        // Signature
        new Paragraph({ children: [new TextRun({ text: 'Yours sincerely,', size: 22 })], spacing: { before: 400, after: 300 } }),
        new Paragraph({ children: [new TextRun({ text: job.planner || 'HPC Planning', bold: true, size: 22 })], spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: 'Town Planner', size: 22 })], spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: 'HPC Planning', size: 22 })], spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: formatDate(new Date()), size: 22 }) ] }),
      ],
    }],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `Fee_Proposal_${job.code || 'draft'}.docx`)
}

export const generatePlanningReport = async (job) => {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ children: [new TextRun({ text: 'PLANNING REPORT', bold: true, size: 48 })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
        new Paragraph({ children: [new TextRun({ text: job.name || 'Planning Application', bold: true, size: 32 })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: job.address || '', size: 24, color: '666666' })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
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
        para(`The subject site is located at ${job.address || '[address]'}, within the ${job.council || '[council]'} local government area. The site is situated within the ${job.zone || '[zone]'}.`),
        para('Insert detailed site description here including lot size, existing improvements, surrounding land uses, access and services.'),
        heading('4. Proposal'),
        para(`The applicant proposes to ${job.proposed_use || '[describe proposed use]'}. The proposal is assessed as ${job.assessment_level || '[assessment level]'} development under the relevant planning scheme.`),
        heading('5. Planning Assessment'),
        subheading('5.1 Relevant Assessment Benchmarks'),
        para(`The application has been assessed against the relevant assessment benchmarks contained within the ${job.council || '[council]'} Planning Scheme.`),
        subheading('5.2 Zone Assessment'),
        para(`The subject site is located within the ${job.zone || '[zone]'}. The proposed use is consistent with the intent of the zone.`),
        subheading('5.3 Overlay Assessment'),
        para('Insert overlay assessment here, including any relevant overlays that apply to the subject site.'),
        heading('6. Referral Agencies'),
        para(job.referral_agencies ? `The following referral agencies have been identified: ${job.referral_agencies}.` : 'No referral agencies have been identified for this application.'),
        heading('7. Conclusion'),
        para(`Having assessed the proposed ${job.proposed_use || 'development'} against the relevant provisions of the ${job.council || '[council]'} Planning Scheme, it is considered that the proposal is appropriate for the site and surrounding area.`),
        new Paragraph({ children: [new TextRun({ text: `Prepared by: ${job.planner || '[Planner name]'}`, size: 24 })], spacing: { before: 400, after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: `Date: ${formatDate(new Date())}`, size: 24 })] }),
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
        new Paragraph({ children: [new TextRun({ text: 'INFORMATION REQUEST RESPONSE', bold: true, size: 48 })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
        new Paragraph({ children: [new TextRun({ text: `IR #${irNumber} — ${job.name || 'Planning Application'}`, bold: true, size: 28 })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
        heading('Application Details'),
        boldPara('Application reference', job.code),
        boldPara('Site address', job.address),
        boldPara('Applicant', `${job.client_first_name || ''} ${job.client_last_name || ''}`),
        boldPara('Application type', job.app_type),
        boldPara('Council', job.council),
        boldPara('Prepared by', job.planner),
        boldPara('Date', formatDate(new Date())),
        heading('Response to Information Request'),
        para(`This response is prepared on behalf of ${job.client_first_name || ''} ${job.client_last_name || ''} in response to the Information Request issued by ${job.council || '[council]'} in relation to the above application.`),
        subheading('IR Item 1'),
        para('Insert council information request item here.'),
        para('Response: Insert response to IR item 1 here.'),
        heading('Conclusion'),
        para('It is considered that this response adequately addresses all matters raised in the Information Request. Should you require any further information, please contact our office.'),
        new Paragraph({ children: [new TextRun({ text: `${job.planner || '[Planner name]'}`, size: 24 })], spacing: { before: 400, after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: formatDate(new Date()), size: 24 })] }),
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
        new Paragraph({ children: [new TextRun({ text: formatDate(new Date()), size: 24 })], spacing: { after: 400 } }),
        new Paragraph({ children: [new TextRun({ text: `${job.client_first_name || ''} ${job.client_last_name || ''}`, size: 24, bold: true })], spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: job.address || '', size: 24 })], spacing: { after: 400 } }),
        new Paragraph({ children: [new TextRun({ text: `Dear ${job.client_first_name || 'Client'},`, size: 24 })], spacing: { after: 300 } }),
        new Paragraph({ children: [new TextRun({ text: `Re: ${job.app_type || 'Planning Application'} — ${job.address || '[address]'}`, bold: true, size: 24 })], spacing: { after: 300 } }),
        para('Thank you for engaging our services in relation to the above matter. We are pleased to confirm our instructions to act on your behalf.'),
        heading('Scope of Services'),
        para(`Our services will include preparation and lodgement of the development application, liaison with ${job.council || '[council]'} throughout the assessment process, and preparation of planning report and supporting documentation.`),
        heading('Fee Estimate'),
        boldPara('Estimated hours', `${job.budget_hours || '[hours]'} hours`),
        boldPara('Hourly rate', `$${job.planner_rate || '[rate]'} per hour (excluding GST)`),
        boldPara('Estimated fee', `$${job.budget_hours && job.planner_rate ? (job.budget_hours * job.planner_rate).toLocaleString() : '[amount]'} (excluding GST)`),
        heading('Next Steps'),
        para('To proceed, please sign and return a copy of this letter confirming your instructions. We will then commence preparation of the application.'),
        new Paragraph({ children: [new TextRun({ text: 'Yours sincerely,', size: 24 })], spacing: { before: 400, after: 300 } }),
        new Paragraph({ children: [new TextRun({ text: job.planner || '[Planner name]', bold: true, size: 24 })], spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: 'Town Planner', size: 24 })] }),
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
        new Paragraph({ children: [new TextRun({ text: 'TAX INVOICE', bold: true, size: 48 })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
        boldPara('Invoice number', `INV-${job.code || 'DRAFT'}-01`),
        boldPara('Date', formatDate(new Date())),
        boldPara('Due date', formatDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000))),
        heading('Bill to'),
        new Paragraph({ children: [new TextRun({ text: `${job.client_first_name || ''} ${job.client_last_name || ''}`, size: 24 })], spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: job.address || '', size: 24 })], spacing: { after: 400 } }),
        heading('Services'),
        boldPara('Description', `${job.app_type || 'Planning'} services — ${job.name || ''}`),
        boldPara('Hours', `${job.budget_hours || 0} hours @ $${job.planner_rate || 0}/hr`),
        boldPara('Subtotal', `$${subtotal.toLocaleString()}`),
        boldPara('GST (10%)', `$${gst.toLocaleString()}`),
        new Paragraph({ children: [new TextRun({ text: 'TOTAL: ', bold: true, size: 28 }), new TextRun({ text: `$${total.toLocaleString()}`, bold: true, size: 28 })], spacing: { before: 200, after: 400 } }),
        heading('Payment details'),
        para('Please make payment by direct deposit. Payment is due within 14 days. Thank you for your business.'),
      ],
    }],
  })
  const blob = await Packer.toBlob(doc)
  saveAs(blob, `Invoice_${job.code || 'draft'}.docx`)
}
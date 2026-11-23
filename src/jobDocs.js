// src/jobDocs.js
// Saves a file with a job. If the job has a Microsoft 365 folder, the file goes there.
// Otherwise it is kept in QPlan, on the job's Documents tab.
import { supabase } from './supabase'
import { callGraph } from './OneDriveBrowser'

function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.onerror = () => reject(new Error('The file could not be read'))
    reader.readAsDataURL(blob)
  })
}

const safeName = (name) => String(name || 'document').replace(/[^\w.\- ]+/g, '_')

// Returns { where: 'folder' | 'qplan', url? } or throws with a plain message
export async function saveDocToJob({ job, currentUser, blob, filename }) {
  if (job?.onedrive_folder_id) {
    const res = await callGraph('upload_file', {
      drive_id: job.onedrive_drive_id || null,
      parent_id: job.onedrive_folder_id,
      name: filename,
      content_base64: await toBase64(blob),
    })
    if (!res.success) throw new Error(res.error || 'Microsoft 365 did not accept the file')
    return { where: 'folder', url: res.item?.webUrl || null }
  }

  const path = `${currentUser.company_id}/${job.id}/${Date.now()}_${safeName(filename)}`
  const { error: uploadError } = await supabase.storage.from('documents').upload(path, blob, { upsert: false })
  if (uploadError) throw new Error(uploadError.message)
  const { error: rowError } = await supabase.from('documents').insert({
    company_id: currentUser.company_id, job_id: job.id, job_code: job.code,
    name: filename, file_path: path, file_url: null,
    file_type: filename.split('.').pop().toLowerCase(),
    file_size: blob.size, uploaded_by: currentUser.username || 'Unknown',
  })
  if (rowError) throw new Error(rowError.message)
  return { where: 'qplan' }
}

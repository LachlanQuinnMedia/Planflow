import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sltaaiumviyzgdsdkkbe.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsdGFhaXVtdml5emdkc2Rra2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTYyNTMsImV4cCI6MjA5MDQ5MjI1M30.xqWqvx8vdofj119nXDpasQ8xVD67YJU0RrjTrxycTGo'

export const supabase = createClient(supabaseUrl, supabaseKey)
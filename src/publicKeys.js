// src/publicKeys.js
// Where the QPlan backend lives, and its public key. The key only identifies the project.
// What a person can see is decided by their sign-in and the database rules, not by this key.
// Kept apart from supabase.js so the public website can send a demo request without
// loading the app's sign-in code.
export const SUPABASE_URL = 'https://sltaaiumviyzgdsdkkbe.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsdGFhaXVtdml5emdkc2Rra2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTYyNTMsImV4cCI6MjA5MDQ5MjI1M30.xqWqvx8vdofj119nXDpasQ8xVD67YJU0RrjTrxycTGo'

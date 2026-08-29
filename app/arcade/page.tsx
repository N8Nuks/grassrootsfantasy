import { redirect } from 'next/navigation'

/* The public-facing address for the arcade. The games themselves live under
   /games — this is the door people are given. */
export default function Arcade() {
  redirect('/games')
}
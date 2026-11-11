import { redirect } from 'next/navigation';

export default function RootPage() {
  // ALWAYS redirect to the login page when hitting the root URL
  redirect('/login');
}
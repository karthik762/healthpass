import { Link } from 'react-router-dom';
import Brand from '../components/Brand';
import Button from '../components/Button';

export default function NotFoundPage() { return <main className="not-found"><Brand /><p className="eyebrow">404</p><h1>This page isn’t part of your health space.</h1><p>Let’s bring you back to a familiar place.</p><Link to="/dashboard"><Button>Go to dashboard</Button></Link></main>; }

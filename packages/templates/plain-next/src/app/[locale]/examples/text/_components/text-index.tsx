'use client';
import { localeHref } from '../../../../../infra/resources/routing';
import Link from 'next/link';
import { TextNavigation } from './text-navigation';
import { useText } from '../../../../../infra/resources/client';
function IndexContent() {
  const text = useText();
  return (
    <>
      <Link href={localeHref('/', text.locale)}>{text.getText('main', 'textDemo.back')}</Link>
      <TextNavigation />
      <h1>{text.getText('main', 'textDemo.index.title')}</h1>
      <p>{text.getText('main', 'textDemo.index.description')}</p>
      <p>{text.getText('main', 'textDemo.index.instructions')}</p>
    </>
  );
}
export function TextIndexPage() {
  return <IndexContent />;
}

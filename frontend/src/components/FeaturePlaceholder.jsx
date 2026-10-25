import PageIntro from './PageIntro';
import { Notice, EmptyState } from './StateMessage';

export default function FeaturePlaceholder({ title, description, icon, children, privacyNote }) {
  return (
    <>
      <PageIntro title={title} description={description} />
      <Notice>{privacyNote || 'This is an early product preview. No real patient data is shown or shared here.'}</Notice>
      {children || <EmptyState icon={icon} title="Coming in a future phase">This module is designed and ready to connect when its consent and authorization workflow is implemented.</EmptyState>}
    </>
  );
}

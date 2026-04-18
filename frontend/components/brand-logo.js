export function BrandLogo({ compact = false }) {
  return (
    <div className={compact ? 'brand-logo compact' : 'brand-logo'}>
      <img src="/logo.png" alt="SkillBridge AI logo" className="brand-logo-svg" />
    </div>
  );
}

export type FeatureCardProps = {
  title: string
  description: string
  emoji: string
  lugeReveal?: string
  Component?: React.FC
}

export function FeatureSimpleCard ({ title, description, emoji, lugeReveal }: FeatureCardProps) {
  return (
    <div className="feature-card simple-card"
      data-lg-reveal={lugeReveal}
      data-lg-reveal-delay="0.15"
    >
      <div className="feature__visualization">
        <div className="feature__emoji">{emoji}</div>
      </div>

      <div className="feature__meta meta--center">
        <h3 className="meta__title">{title}</h3>
        <p className="meta__description">{description}</p>
      </div>
    </div>
  )
}

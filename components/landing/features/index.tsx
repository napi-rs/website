export * from './section'

import { FeatureSection } from './section'
import { FeatureSimpleCard, FeatureCardProps } from './simple-card'

// @TODO: Update features list & Make full motion cards
export function Features() {

  const featuresList: FeatureCardProps[] = [
    {
      emoji: '🚀',
      title: 'Native Performance',
      description: 'Bring native performance for Node.js',
      lugeReveal: 'fade-to-right',
    },
    {
      emoji: '👷‍♂️',
      title: 'Memory safe',
      description: 'Guaranteed by Rust compiler.',
      lugeReveal: 'fade-to-left',
    },
    {
      emoji: '⚡️',
      title: 'Zero Copy',
      description: 'Zero copy data interactive between Rust & Node.js via Buffer and TypedArray.',
      lugeReveal: 'fade-to-right',
    },
    {
      emoji: '⚙️',
      title: 'Parallelism',
      description: 'Parallelism in few lines.',
      lugeReveal: 'fade-to-left',
    },
  ]

  return (
    <FeatureSection
      className='features-bento'
      title="Feature Highlights"
      type="pink"
      data-lg-reveal
      data-lg-reveal-stagger="0.2"
    >

      {featuresList.map((feature, index) => (
        <FeatureSimpleCard
          key={index}
          title={feature.title}
          description={feature.description}
          emoji={feature.emoji}
          lugeReveal={feature.lugeReveal}
        />
      ))}

    </FeatureSection>
  )
}

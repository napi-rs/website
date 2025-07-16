export * from './section'

import { PowerfulCICard } from './powerful-ci'
import { RichPlatformsCard } from './rich-platforms'
import { OptimizedPerformanceCard } from './optimized-performance'
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
      Component: FeatureSimpleCard,
    },
    {
      emoji: '👷‍♂️',
      title: 'Powerful & Flexible CI',
      description: 'Reduce the complex CI setup, stay focus on your development.',
      lugeReveal: 'fade-to-left',
      Component: PowerfulCICard,
    },
    {
      emoji: '⚡️',
      title: 'Rich Platform Support',
      description: 'Supports all common Node.js runtime platforms.',
      lugeReveal: 'fade-to-right',
      Component: RichPlatformsCard,
    },
    {
      emoji: '⚙️',
      title: 'Optimized Performance',
      description: 'Zero cost abstraction with high level features.',
      lugeReveal: 'fade-to-left',
      Component: OptimizedPerformanceCard,
    },
  ]

  return (
    <FeatureSection
      className="features-bento feature-section--flip"
      title="Feature Highlights"
      type="pink"
      data-lg-reveal
      data-lg-reveal-stagger="0.2"
    >
      {featuresList.map((feature, index) => {
        const Component = feature.Component || FeatureSimpleCard
        return (
          <Component
            key={index}
            title={feature.title}
            description={feature.description}
            emoji={feature.emoji}
            lugeReveal={feature.lugeReveal}
          />
        )
      })}
    </FeatureSection>
  )
}

export default Features

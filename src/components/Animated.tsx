import { motion, useScroll, useTransform, type MotionValue, type Variants } from 'framer-motion'
import type { PropsWithChildren, ReactNode, RefObject } from 'react'

export const smoothEase = [0.16, 1, 0.3, 1] as const

export function FadeUp({ children, delay = 0 }: PropsWithChildren<{ delay?: number }>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 70, filter: 'blur(18px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: false, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 1.15, delay, ease: smoothEase }}
    >
      {children}
    </motion.div>
  )
}

export function MaskReveal({
  children,
  delay = 0,
  className = '',
}: PropsWithChildren<{ delay?: number; className?: string }>) {
  return (
    <span className={`block overflow-hidden ${className}`}>
      <motion.span
        className="block origin-left"
        initial={{ y: '112%', scaleX: 0.72, skewY: 3 }}
        whileInView={{ y: '0%', scaleX: 1, skewY: 0 }}
        viewport={{ once: false, margin: '0px 0px -8% 0px' }}
        transition={{ duration: 1.25, delay, ease: smoothEase }}
      >
        {children}
      </motion.span>
    </span>
  )
}

export function DriftReveal({
  children,
  delay = 0,
  className = '',
}: PropsWithChildren<{ delay?: number; className?: string }>) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 86 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 1.35, delay, ease: smoothEase }}
    >
      {children}
    </motion.div>
  )
}

export function SectionIntro({
  kicker,
  title,
  align = 'left',
}: {
  kicker: string
  title: ReactNode
  align?: 'left' | 'center'
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-5xl text-center' : 'max-w-5xl'}>
      <DriftReveal>
        <p className="text-sm tracking-[0.42em] text-amber-100/75">{kicker}</p>
      </DriftReveal>
      <DriftReveal delay={0.12}>
        <h2 className="mt-5 text-5xl font-medium leading-tight text-white md:text-7xl">{title}</h2>
      </DriftReveal>
    </div>
  )
}

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.18,
    },
  },
}

export const cardReveal: Variants = {
  hidden: { opacity: 0, y: 90, scale: 0.94, filter: 'blur(20px)' },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { duration: 1.15, ease: smoothEase },
  },
}

export function ImageReveal({
  src,
  alt,
  className = '',
  targetRef,
}: {
  src: string
  alt: string
  className?: string
  targetRef?: RefObject<HTMLElement | null>
}) {
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['start end', 'end start'],
  })
  const y: MotionValue<number> = useTransform(scrollYProgress, [0, 1], [-36, 36])

  return (
    <motion.div
      className={`overflow-hidden ${className}`}
      initial={{ clipPath: 'inset(16% 0% 16% 0%)', opacity: 0, scale: 0.96 }}
      whileInView={{ clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 1.35, ease: smoothEase }}
    >
      <motion.img className="h-full w-full scale-110 object-cover" src={src} alt={alt} style={{ y }} />
    </motion.div>
  )
}

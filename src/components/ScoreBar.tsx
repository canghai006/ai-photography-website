import { motion } from 'framer-motion'

type ScoreBarProps = {
  label: string
  value: number
}

export function ScoreBar({ label, value }: ScoreBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-zinc-300">
        <span>{label}</span>
        <span className="font-medium text-amber-200">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-amber-200 via-sky-200 to-violet-300"
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  )
}

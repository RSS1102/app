import './HelpTip.scss'

import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { classnames } from '../../utils'

export type IHelpTip = [node: ReactNode, probability: number]

export interface HelpTipProps {
  tips: IHelpTip[]
  storageKey?: string
}

HelpTip.prefix = 'ppd-help-tip'
export function HelpTip(props: HelpTipProps) {
  const {
    prefix
  } = HelpTip
  const {
    tips
  } = props
  const ref = useRef<HTMLDivElement>(null)
  const getAHelpTipForThis = useMemo(() => getAHelpTip.bind(null, tips), [tips])
  const [pinned, setPinned] = useState(false)
  const [helpTip, setHelpTip] = useState<IHelpTip | undefined>(getAHelpTipForThis)
  const resetAnimation = useCallback(() => {
    const opts = ref.current!.querySelector<HTMLDivElement>(`.${prefix}__opts__line`)!
    opts.style.animation = 'none'
    // noinspection BadExpressionStatementJS
    opts.offsetHeight
    opts.style.animation = ''
  }, [prefix])
  const updateHelpTip = useCallback(() => {
    resetAnimation()
    clearTimeout(timer.current)
    setHelpTip(prev => getAHelpTipForThis(prev))
  }, [resetAnimation, getAHelpTipForThis])
  const timer = useRef<number>()
  const prevMillionSeconds = useRef<number>()
  const stopMillionSeconds = useRef<number>()
  const durationMillionSeconds = useRef<number>()
  const setTimer = useCallback((time = 5000) => {
    clearTimeout(timer.current)
    prevMillionSeconds.current = Date.now()
    timer.current = setTimeout(() => {
      setHelpTip(prev => getAHelpTipForThis(prev))
      durationMillionSeconds.current = 0
    }, time) as unknown as number
  }, [getAHelpTipForThis])
  useEffect(() => {
    if (helpTip) {
      prevMillionSeconds.current = stopMillionSeconds.current = Date.now()
      durationMillionSeconds.current = 0
      setTimer()
    }
    return () => {
      resetAnimation()
      clearTimeout(timer.current)
    }
  }, [helpTip, resetAnimation, setTimer])

  return helpTip ? <div
    ref={ref}
    className={classnames(prefix, {
      [`${prefix}--pinned`]: pinned
    })}
    onMouseEnter={() => {
      clearTimeout(timer.current)
      stopMillionSeconds.current = Date.now()
    }}
    onMouseLeave={() => {
      if (
        !pinned
        && stopMillionSeconds.current
        && prevMillionSeconds.current
      ) {
        durationMillionSeconds.current =
          (durationMillionSeconds.current ?? 0) +
          (stopMillionSeconds.current - prevMillionSeconds.current)

        setTimer(5000 - durationMillionSeconds.current)
      }
    }}
    >
    <span className={`${prefix}__content`}>
      {helpTip[0]}
    </span>
    <div className={`${prefix}__opts`}>
      <div className={`${prefix}__opts__line`} />
      <span className={`${prefix}__opts__btns`}>
        <button
          title='Hide tip'
          onClick={() => setHelpTip(undefined)}
        >
          <span className='cldr codicon codicon-close' />
        </button>
        <button
          title={pinned ? 'Unpin tip' : 'Pin tip'}
          onClick={() => {
            setPinned(prevIsPinned => {
              if (prevIsPinned) {
                prevMillionSeconds.current = stopMillionSeconds.current = Date.now()
                durationMillionSeconds.current = 0
                setTimer()
              } else {
                clearTimeout(timer.current)
              }
              return !prevIsPinned
            })
          }}
        >
          <span className={classnames('cldr codicon', {
            'codicon-pin': !pinned,
            'codicon-pinned': pinned
          })} />
        </button>
      </span>
      <button onClick={() => {
        updateHelpTip()
        prevMillionSeconds.current = stopMillionSeconds.current = Date.now()
        durationMillionSeconds.current = 0
      }}>
        Next tip
        <span className='cldr codicon codicon-fold-up' />
      </button>
    </div>
  </div> : null
}

function getAHelpTip(tips: IHelpTip[], prevTip?: IHelpTip) {
  const realTips = tips.filter(tip => tip !== prevTip)
  const probabilitySum = realTips
    .filter(([_, probability]) => probability > 0)
    .reduce((acc, [_, probability]) => acc + probability, 0)
  const randomNum = Math.random() * probabilitySum
  let sum = 0
  for (const [, value] of Object.entries(realTips)) {
    sum += value[1]
    if (randomNum < sum) {
      return value
    }
  }
}
import type { ReactElement, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export type ConfirmDialogProps = {
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void
  children: ReactNode
}

/**
 * A confirmation the reader can read.
 *
 * Replaces the `window.confirm` the design used. A native confirm cannot be styled,
 * cannot be translated beyond its message, blocks the whole tab, and is suppressed
 * outright by some browsers — none of which is acceptable for "delete this loan and
 * everything using it".
 */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  children,
}: ConfirmDialogProps): ReactElement {
  const { t } = useTranslation()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="border-rule bg-card squircle rounded-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display text-lg font-normal">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-ink-2 text-sm">{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-rule squircle rounded-md transition-[color,box-shadow] duration-150">
            {t('dialogs.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-shu text-paper squircle rounded-md transition-[color,box-shadow] duration-150"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

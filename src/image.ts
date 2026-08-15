/** Image-reading helpers built only on public filesystem and attachment services. */

import { basename, extname } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { AttachmentError, AttachmentId } from '@deepseek-ai/dsh-attachment'
import type { ImageAttachmentRef, ImageMediaType } from '@deepseek-ai/dsh-attachment'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import { FsError } from '@deepseek-ai/dsh-fs'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'

/** Image result retained by the Codex-compatible tool. */
export interface ImageReadValue {
  path: string
  image: { attachmentId: string; mediaType: ImageMediaType; bytes: number; width: number; height: number; name?: string }
}

const IMAGE_TYPES: Readonly<Record<string, ImageMediaType>> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
}

/** Render a stored image into model-visible text and image blocks. */
export function imageReadContent(value: ImageReadValue): ContentBlock[] {
  const image: ImageAttachmentRef = {
    attachmentId: AttachmentId(value.image.attachmentId),
    mediaType: value.image.mediaType,
    bytes: value.image.bytes,
    width: value.image.width,
    height: value.image.height,
    ...value.image.name === undefined ? {} : { name: value.image.name },
  }
  return [{ type: 'text', text: `<path>${value.path}</path>\n<type>image</type>\n<content>\n${image.mediaType} image, ${image.width}x${image.height} px, ${image.bytes} bytes\n</content>` }, { type: 'image', attachment: image }]
}

/** Read, validate, and persist a local image through public DSH capabilities. */
export async function readImage(ctx: Context, exec: ToolExecution, path: string, plugin: string): Promise<ImageReadValue> {
  if (path.trim().length === 0) throw new Error('path must be a non-empty string')
  const mediaType = IMAGE_TYPES[extname(path).toLowerCase()]
  if (mediaType === undefined) throw new Error(`cannot read "${path}": view_image only accepts PNG/JPEG/WebP/GIF paths`)
  const attachments = ctx.get('attachments')
  if (attachments === undefined) throw new Error(`cannot read "${path}" as an image: no attachment service is mounted`)
  if (!attachments.imageLimits.mediaTypes.includes(mediaType)) throw new Error(`cannot read "${path}": ${mediaType} images are not accepted by this deployment`)
  const target = await ctx.fs.resolve(path, { cwd: exec.agent?.session.header.cwd, signal: exec.signal })
  const info = await ctx.fs.stat(target, exec.signal)
  if (info === undefined) {
    ctx.emit('fs/observed', target, { kind: 'absent' }, exec)
    throw new FsError(`cannot read "${target.displayPath}": not found`, 'FS_NOT_FOUND')
  }
  if (info.type !== 'file') throw new FsError(`cannot read "${target.displayPath}": not a regular file`, 'FS_NOT_REGULAR_FILE')
  const data = await ctx.fs.readBytes(target, exec.signal, Math.min(attachments.imageLimits.maxImageBytes, attachments.imageLimits.maxMessageImageBytes))
  let ref: ImageAttachmentRef
  try {
    ref = await attachments.saveImage({ data, mediaType, name: basename(target.displayPath) })
  } catch (error: unknown) {
    if (!(error instanceof AttachmentError) || error.code !== 'IMAGE_TYPE_MISMATCH') throw error
    throw new Error(`cannot read "${target.displayPath}": the extension does not match the image bytes`, { cause: error })
  }
  ctx.emit('fs/observed', target, { kind: 'present', version: info.version }, exec)
  const value: ImageReadValue = { path: target.displayPath, image: { attachmentId: ref.attachmentId, mediaType: ref.mediaType, bytes: ref.bytes, width: ref.width, height: ref.height, ...ref.name === undefined ? {} : { name: ref.name } } }
  void plugin
  return value
}

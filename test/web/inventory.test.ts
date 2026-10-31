import { expect, it } from 'vitest'
import { galleryModes } from '../../site/src/mocks/gallery'
import { gallerySectionCopy } from '../../site/src/mocks/gallery-sections'

const sectionKeys = [
  'tokens',
  'primitives',
  'shell',
  'conversation',
  'documents',
  'terminals',
] as const

it('declares the six gallery sections with matching titles in both locales', () => {
  const en = gallerySectionCopy('en').sections
  const pt = gallerySectionCopy('pt-br').sections
  expect(Object.keys(en)).toEqual([...sectionKeys])
  expect(Object.keys(pt)).toEqual([...sectionKeys])
  for (const key of sectionKeys) {
    expect(en[key].title.length).toBeGreaterThan(0)
    expect(pt[key].title.length).toBeGreaterThan(0)
  }
})

it('covers every interaction state the styleguide must demonstrate', () => {
  expect([...galleryModes]).toEqual([
    'default',
    'hover',
    'focus',
    'disabled',
    'loading',
    'selected',
    'empty',
    'error',
  ])
})

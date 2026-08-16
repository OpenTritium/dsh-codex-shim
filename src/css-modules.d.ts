declare module '*.module.css' {
  const classes: Record<string, string>
  export function mount(): void
  export function dispose(): void
  export default classes
}

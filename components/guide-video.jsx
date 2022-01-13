export const GuideVideo = () => {
  return (
    <video controls style={{ width: '100%' }}>
      <source src="/assets/napi-rs-guide.mp4" type="video/mp4" />
      <track kind="captions" srcLang="en" />
    </video>
  )
}

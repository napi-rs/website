import { buildDynamicMDX, buildDynamicMeta } from 'nextra/remote'

export const getChangelog = async (packageName, locale = 'en') => {
  let page = 1
  let releases = await fetch(
    `https://api.github.com/repos/napi-rs/napi-rs/releases?per_page=100&page=${page}`,
    {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
    },
  ).then((res) => res.json())

  while (releases.length === 100) {
    page++
    releases = releases.concat(
      await fetch(
        `https://api.github.com/repos/napi-rs/napi-rs/releases?per_page=100&page=${page}`,
        {
          headers: {
            Authorization: `token ${process.env.GITHUB_TOKEN}`,
          },
        },
      ).then((res) => res.json()),
    )
  }

  return {
    props: {
      ...(await buildDynamicMDX(
        releases
          .filter(({ name }) => name.startsWith(packageName))
          .map((release) => {
            const body = release.body
              .replace(/&#39;/g, "'")
              .replace(
                /@([a-zA-Z0-9_-]+)(?=(,| ))/g,
                '[@$1](https://github.com/$1)',
              )
            return `## <a href="${
              release.html_url
            }" target="_blank" rel="noopener">${release.tag_name}</a> 
  ${new Date(release.published_at).toLocaleDateString(locale)} \n${body}`
          })
          .join('\n\n'),
      )),
      ...(await buildDynamicMeta()),
    },
    revalidate: 10,
  }
}

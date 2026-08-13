function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function Avatar({
  url,
  name,
  size = 40,
}: {
  url: string | null | undefined;
  name: string | null | undefined;
  size?: number;
}) {
  const style = { width: size, height: size };

  if (url) {
    return (
      <img
        src={url}
        alt={name || 'Profile picture'}
        style={style}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      style={style}
      className="flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary"
    >
      {name ? initials(name) : '?'}
    </span>
  );
}

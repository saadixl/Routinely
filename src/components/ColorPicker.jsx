import { COLORS } from '../lib/palette';

export default function ColorPicker({ value, onChange }) {
  return (
    <div className="swatches">
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          className={`swatch${value === c ? ' on' : ''}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
          aria-label={`Color ${c}`}
        />
      ))}
    </div>
  );
}

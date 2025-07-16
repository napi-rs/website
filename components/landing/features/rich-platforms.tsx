import { FeatureCardProps } from './simple-card'
import { useCardAnimation } from '../hooks/useCardAnimation';

import logoApple from './images/apple.svg';
import logoNode from './images/node-js.svg';
import logoUbuntu from './images/ubuntu.svg';
import logoChrome from './images/chrome.svg';
import logoWA from './images/wa.svg';
import logoLinux from './images/linux.svg';

export function RichPlatformsCard ({ title, description, emoji, lugeReveal }: FeatureCardProps) {
  const id = 'rich-platforms'

  const { startAnimation, isCardActive } = useCardAnimation(
    `#${id}`,
    undefined,
    {
      once: true,
    }
  );

  const handleMouseOver = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    startAnimation();
  };

  return (
    <div
      className={`feature-card`}
      id={id}
      data-lg-reveal={lugeReveal}
      data-lg-reveal-delay="0.15"
      onMouseOver={handleMouseOver}
    >
      <div className={`feature__visualization ${isCardActive ? 'active' : ''}`}>
        <div className="card-container">
          {/* SVG background with multiple card paths */}
          <svg
            className="background-cards"
            width="658"
            viewBox="0 0 658 275"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M105.376 201.33C105.376 193.847 111.442 187.781 118.925 187.781H176.507C183.99 187.781 190.056 193.847 190.056 201.33V258.912C190.056 266.395 183.99 272.461 176.507 272.461H118.925C111.442 272.461 105.376 266.395 105.376 258.912V201.33Z"
              className="background-card"
            />
            <path
              d="M525.389 96.3271C525.389 88.8443 531.455 82.7783 538.937 82.7783H596.518C604 82.7783 610.066 88.8443 610.066 96.3271V153.909C610.066 161.392 604 167.458 596.518 167.458H538.937C531.455 167.458 525.389 161.392 525.389 153.909V96.3271Z"
              className="background-card"
            />
            <path
              d="M210.38 -10.3692C210.38 -17.852 216.446 -23.9179 223.929 -23.9179H281.512C288.994 -23.9179 295.06 -17.852 295.06 -10.3692V47.2129C295.06 54.6957 288.994 60.7617 281.512 60.7617H223.929C216.446 60.7617 210.38 54.6957 210.38 47.2129V-10.3692Z"
              className="background-card"
            />
            <path
              d="M525.389 201.33C525.389 193.847 531.455 187.781 538.937 187.781H596.518C604 187.781 610.066 193.847 610.066 201.33V258.912C610.066 266.395 604 272.461 596.518 272.461H538.937C531.455 272.461 525.389 266.395 525.389 258.912V201.33Z"
              className="background-card"
            />
            <path
              d="M630.389 201.33C630.389 193.847 636.455 187.781 643.938 187.781H701.52C709.003 187.781 715.069 193.847 715.069 201.33V258.912C715.069 266.395 709.003 272.461 701.52 272.461H643.938C636.455 272.461 630.389 266.395 630.389 258.912V201.33Z"
              className="background-card"
            />
            <path
              d="M0.373901 201.33C0.373901 193.847 6.4399 187.781 13.9227 187.781H71.5045C78.9873 187.781 85.0531 193.847 85.0531 201.33V258.912C85.0531 266.395 78.9873 272.461 71.5045 272.461H13.9227C6.4399 272.461 0.373901 266.395 0.373901 258.912V201.33Z"
              className="background-card"
            />
            <path
              d="M630.389 96.3271C630.389 88.8443 636.455 82.7783 643.938 82.7783H701.52C709.003 82.7783 715.069 88.8443 715.069 96.3271V153.909C715.069 161.392 709.003 167.458 701.52 167.458H643.938C636.455 167.458 630.389 161.392 630.389 153.909V96.3271Z"
              className="background-card"
            />
            <path
              d="M0.373901 96.3271C0.373901 88.8443 6.4399 82.7783 13.9227 82.7783H71.5045C78.9873 82.7783 85.0531 88.8443 85.0531 96.327V153.909C85.0531 161.392 78.9873 167.458 71.5045 167.458H13.9227C6.4399 167.458 0.373901 161.392 0.373901 153.909V96.3271Z"
              className="background-card"
            />
            <path
              d="M630.389 -10.3692C630.389 -17.852 636.455 -23.918 643.938 -23.918H701.52C709.003 -23.918 715.069 -17.852 715.069 -10.3692V47.2129C715.069 54.6957 709.003 60.7616 701.52 60.7616H643.938C636.455 60.7616 630.389 54.6957 630.389 47.2129V-10.3692Z"
              className="background-card"
            />
            <path
              d="M0.373901 -10.3692C0.373901 -17.852 6.4399 -23.9179 13.9227 -23.9179H71.5045C78.9873 -23.9179 85.0531 -17.852 85.0531 -10.3692V47.2129C85.0531 54.6957 78.9873 60.7617 71.5045 60.7617H13.9227C6.4399 60.7617 0.373901 54.6957 0.373901 47.2129V-10.3692Z"
              className="background-card"
            />
            <path
              d="M525.389 -10.3692C525.389 -17.8519 531.455 -23.9179 538.937 -23.9179H596.518C604 -23.9179 610.066 -17.8519 610.066 -10.3692V47.213C610.066 54.6957 604 60.7617 596.518 60.7617H538.937C531.455 60.7617 525.389 54.6957 525.389 47.213V-10.3692Z"
              className="background-card"
            />
            <path
              d="M420.386 -10.3692C420.386 -17.852 426.452 -23.9179 433.935 -23.9179H491.517C499 -23.9179 505.066 -17.852 505.066 -10.3692V47.2129C505.066 54.6957 499 60.7617 491.517 60.7617H433.935C426.452 60.7617 420.386 54.6957 420.386 47.2129V-10.3692Z"
              className="background-card"
            />
            <path
              d="M315.383 -10.3692C315.383 -17.852 321.449 -23.9179 328.932 -23.9179H386.514C393.997 -23.9179 400.063 -17.852 400.063 -10.3692V47.2129C400.063 54.6957 393.997 60.7617 386.514 60.7617H328.932C321.449 60.7617 315.383 54.6957 315.383 47.2129V-10.3692Z"
              className="background-card"
            />
            <path
              d="M210.38 203.023C210.38 195.541 216.446 189.475 223.929 189.475H281.512C288.994 189.475 295.06 195.541 295.06 203.023V260.605C295.06 268.088 288.994 274.154 281.512 274.154H223.929C216.446 274.154 210.38 268.088 210.38 260.605V203.023Z"
              className="background-card"
            />
            <path
              d="M315.383 203.023C315.383 195.541 321.449 189.475 328.932 189.475H386.514C393.997 189.475 400.063 195.541 400.063 203.023V260.605C400.063 268.088 393.997 274.154 386.514 274.154H328.932C321.449 274.154 315.383 268.088 315.383 260.605V203.023Z"
              className="background-card"
            />
          </svg>

          {/* Feature cards with respective logos */}
          <div className="card card--apple">
            <img src={logoApple.src} alt="Apple" />
          </div>
          <div className="card card--node">
            <img src={logoNode.src} alt="Node" />
          </div>
          <div className="card card--linux">
            <img src={logoLinux.src} alt="Linux" />
          </div>
          <div className="card card--chrome">
            <img src={logoChrome.src} alt="Chrome" />
          </div>
          <div className="card card--wa">
            <img src={logoWA.src} alt="WebAssembly" />
          </div>
          <div className="card card--ubuntu">
            <img src={logoUbuntu.src} alt="ubuntu" />
          </div>
        </div>

        {/* Center glow effect for visual enhancement */}
        <div className="center-glow" />
      </div>
      <div className="feature__meta meta--center">
        <h3 className="meta__title">{title}</h3>
        <p className="meta__description">{description}</p>
      </div>
    </div>
  )
}

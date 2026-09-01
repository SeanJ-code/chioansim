import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';
import { CustomEase } from 'gsap/CustomEase';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, Flip, CustomEase);
CustomEase.create('care-soft', '0.16, 1, 0.3, 1');

export { gsap, ScrollTrigger, Flip };

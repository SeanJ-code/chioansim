import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(ScrollTrigger, Flip, CustomEase);
CustomEase.create('care-soft', '0.16, 1, 0.3, 1');

export { gsap, ScrollTrigger, Flip };

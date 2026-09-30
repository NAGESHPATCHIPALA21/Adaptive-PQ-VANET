import {
  Activity,
  Radio,
  Car,
  Shield,
  Cpu,
  Play,
  BarChart3,
  Layers,
  Clock,
  Server
} from 'lucide-react';

export const NAV_GROUPS = [
  {
    category: 'PRIMARY',
    items: [
      { id: 'overview', label: 'Overview', icon: Activity, desc: 'Security Operations Center' },
      { id: 'network', label: 'Network', icon: Radio, desc: 'VANET Highway Topology' },
      { id: 'mt_agkm', label: 'MT-AGKM', icon: Cpu, desc: 'Adaptive Key Management' }
    ]
  },
  {
    category: 'OPERATIONAL',
    items: [
      { id: 'vehicles', label: 'Vehicles', icon: Car, desc: 'Vehicle Registry & Privacy' },
      { id: 'security', label: 'Security', icon: Shield, desc: 'Authentication & Threat Console' },
      { id: 'events', label: 'Events', icon: Clock, desc: 'Security Audit Log' }
    ]
  },
  {
    category: 'ANALYSIS',
    items: [
      { id: 'simulation', label: 'Simulation', icon: Play, desc: 'VANET Simulation Lab' },
      { id: 'benchmarks', label: 'Benchmarks', icon: BarChart3, desc: 'Performance & Evaluation' }
    ]
  },
  {
    category: 'TECHNICAL',
    items: [
      { id: 'cryptography', label: 'Cryptography', icon: Layers, desc: 'Post-Quantum & Crypto Stack' },
      { id: 'system', label: 'System', icon: Server, desc: 'Platform Status' }
    ]
  }
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);
